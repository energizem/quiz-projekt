require('dotenv').config();

const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// ******************************************************
// KRAJ IZMJENA ZA POVEZIVANJE NA lokalnu bazu
// ******************************************************
/* const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
}); */

// ******************************************************
// OVDJE SU POTREBNE IZMJENE ZA POVEZIVANJE NA RENDER BAZU
// ******************************************************

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
       rejectUnauthorized: false 
    }
});


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/badmin', express.static('badmin'));

// Posljednje unesena regija i grupa za automatsko popunjavanje
let lastEnteredRegion = '';
let lastEnteredGroup = '';

// Ruta za prikaz obrasca za unos/pregled pitanja
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// GET ruta za dohvaćanje svih pitanja s odgovorima
app.get('/api/pitanja', async (req, res) => {
    const { regija, grupa } = req.query; // Dohvati parametre za filtriranje

    let queryText = `
        SELECT
            p.id,
            p.regija,
            p.grupa,
            p.tekst_de,
            p.tekst_hr,
            p.slika_url,
            json_agg(json_build_object('id', o.id, 'tekst_de', o.tekst_de, 'tekst_hr', o.tekst_hr, 'tocan', o.tocan) ORDER BY o.id) AS odgovori
        FROM
            pitanja p
        JOIN
            odgovori o ON p.id = o.pitanje_id
    `;
    const queryParams = [];
    const conditions = [];

    if (regija) {
        let regijeArray = regija;
        if (!Array.isArray(regijeArray)) regijeArray = [regijeArray];
        if (!(regijeArray.length === 1 && regijeArray[0] === 'all')) {
            const placeholders = regijeArray.map((_, i) => `$${queryParams.length + i + 1}`).join(', ');
            conditions.push(`p.regija IN (${placeholders})`);
            queryParams.push(...regijeArray);
        }
    }
    if (grupa) {
        conditions.push(`p.grupa ILIKE $${conditions.length + 1}`);
        queryParams.push(`%${grupa}%`);
    }

    if (conditions.length > 0) {
        queryText += ` WHERE ` + conditions.join(' AND ');
    }

    queryText += ` GROUP BY p.id ORDER BY p.id DESC;`; // Grupira odgovore po pitanju i sortira najnovije prvo

    try {
        const result = await pool.query(queryText, queryParams);
        res.json(result.rows);
    } catch (err) {
        console.error('Greška pri dohvaćanju pitanja:', err);
        res.status(500).json({ error: 'Greška pri dohvaćanju pitanja', details: err.message });
    }
});

// POST ruta za unos novih pitanja
app.post('/api/pitanja', async (req, res) => {
    const {
        regija,
        grupa,
        tekst_de,
        tekst_hr,
        slika_url,
        odgovori_de,
        odgovori_hr,
        tocni_odgovori_indexi
    } = req.body;

    // Ažuriraj posljednje unesene vrijednosti
    lastEnteredRegion = regija;
    lastEnteredGroup = grupa;

    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN'); // Pokreće transakciju

        const questionResult = await client.query(
            `INSERT INTO pitanja (regija, grupa, tekst_de, tekst_hr, slika_url)
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [regija, grupa, tekst_de, tekst_hr, slika_url || null]
        );
        const pitanjeId = questionResult.rows[0].id;

        const answersDeArray = odgovori_de.split(';');
        const answersHrArray = odgovori_hr.split(';');
        const correctIndexes = tocni_odgovori_indexi.split(',').map(Number);

        if (answersDeArray.length !== answersHrArray.length) {
            throw new Error('Broj njemačkih i hrvatskih odgovora se ne podudara.');
        }

        for (let i = 0; i < answersDeArray.length; i++) {
            const isCorrect = correctIndexes.includes(i);
            await client.query(
                `INSERT INTO odgovori (pitanje_id, tekst_de, tekst_hr, tocan)
                 VALUES ($1, $2, $3, $4)`,
                [pitanjeId, answersDeArray[i].trim(), answersHrArray[i].trim(), isCorrect]
            );
        }

        await client.query('COMMIT');
        res.status(200).json({ message: 'Pitanje i odgovori uspješno uneseni!', lastRegion: lastEnteredRegion, lastGroup: lastEnteredGroup });

    } catch (error) {
        if (client) {
            await client.query('ROLLBACK');
        }
        console.error('Greška pri unosu pitanja i odgovora:', error);
        res.status(500).json({ error: 'Greška pri unosu pitanja i odgovora', details: error.message });
    } finally {
        if (client) {
            client.release();
        }
    }
});

// PUT ruta za ažuriranje postojećeg pitanja
app.put('/api/pitanja/:id', async (req, res) => {
    const { id } = req.params;
    const {
        regija,
        grupa,
        tekst_de,
        tekst_hr,
        slika_url,
        odgovori_de,
        odgovori_hr,
        tocni_odgovori_indexi
    } = req.body;

    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN');

        // 1. Ažuriraj pitanje
        await client.query(
            `UPDATE pitanja
             SET regija = $1, grupa = $2, tekst_de = $3, tekst_hr = $4, slika_url = $5
             WHERE id = $6`,
            [regija, grupa, tekst_de, tekst_hr, slika_url || null, id]
        );

        // 2. Obriši stare odgovore za ovo pitanje
        await client.query(`DELETE FROM odgovori WHERE pitanje_id = $1`, [id]);

        // 3. Unesi nove odgovore
        const answersDeArray = odgovori_de.split(';');
        const answersHrArray = odgovori_hr.split(';');
        const correctIndexes = tocni_odgovori_indexi.split(',').map(Number);

        if (answersDeArray.length !== answersHrArray.length) {
            throw new Error('Broj njemačkih i hrvatskih odgovora se ne podudara.');
        }

        for (let i = 0; i < answersDeArray.length; i++) {
            const isCorrect = correctIndexes.includes(i);
            await client.query(
                `INSERT INTO odgovori (pitanje_id, tekst_de, tekst_hr, tocan)
                 VALUES ($1, $2, $3, $4)`,
                [id, answersDeArray[i].trim(), answersHrArray[i].trim(), isCorrect]
            );
        }

        await client.query('COMMIT');
        res.status(200).json({ message: 'Pitanje i odgovori uspješno ažurirani!' });

    } catch (error) {
        if (client) {
            await client.query('ROLLBACK');
        }
        console.error('Greška pri ažuriranju pitanja i odgovora:', error);
        res.status(500).json({ error: 'Greška pri ažuriranju pitanja i odgovora', details: error.message });
    } finally {
        if (client) {
            client.release();
        }
    }
});

// DELETE ruta za brisanje pitanja
app.delete('/api/pitanja/:id', async (req, res) => {
    const { id } = req.params;
    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN');
        // Prvo obriši odgovore povezane s pitanjem (zbog foreign keya)
        await client.query('DELETE FROM odgovori WHERE pitanje_id = $1', [id]);
        // Zatim obriši pitanje
        await client.query('DELETE FROM pitanja WHERE id = $1', [id]);
        await client.query('COMMIT');
        res.status(200).json({ message: 'Pitanje uspješno obrisano!' });
    } catch (error) {
        if (client) {
            await client.query('ROLLBACK');
        }
        console.error('Greška pri brisanju pitanja:', error);
        res.status(500).json({ error: 'Greška pri brisanju pitanja', details: error.message });
    } finally {
        if (client) {
            client.release();
        }
    }
});

// Ruta za dohvaćanje posljednje unesene regije i grupe
app.get('/api/last-input', (req, res) => {
    res.json({ lastRegion: lastEnteredRegion, lastGroup: lastEnteredGroup });
});

// --- OVDJE JE IZMJENA: podrška za više regija i simulaciju ispita ---
app.get('/api/kviz-pitanja', async (req, res) => {
    try {
        let { regija, broj, simulacija } = req.query;

        // Simulacija ispita: 12 random pitanja iz svake regije, redom
        if (simulacija === 'true') {
            if (!Array.isArray(regija)) {
                regija = [regija];
            }
            regija = regija.filter(r => r && r.trim() !== '');

            const brojPitanjaPoRegiji = parseInt(broj, 10) || 12;
            const placeholders = regija.map((_, i) => `$${i + 1}`).join(', ');
            const queryText =
                'SELECT p.id AS pitanje_id, p.regija, p.grupa, p.tekst_de AS pitanje_tekst_de, ' +
                'p.tekst_hr AS pitanje_tekst_hr, p.slika_url, o.id AS odgovor_id, o.tekst_de AS odgovor_tekst_de, ' +
                'o.tekst_hr AS odgovor_tekst_hr, o.tocan FROM pitanja p ' +
                'JOIN odgovori o ON p.id = o.pitanje_id ' +
                'WHERE p.regija IN (' + placeholders + ')';

            const queryParams = regija;

            const result = await pool.query(queryText, queryParams);

            // Debug: Prikaži prvih 10 redova iz baze
            console.log('Prvih 10 redova iz baze:', result.rows.slice(0, 10));

            // Grupiraj pitanja po regiji i po ID-u
            const pitanjaPoRegiji = {};
            result.rows.forEach(row => {
                if (!pitanjaPoRegiji[row.regija]) pitanjaPoRegiji[row.regija] = {};
                if (!pitanjaPoRegiji[row.regija][row.pitanje_id]) {
                    pitanjaPoRegiji[row.regija][row.pitanje_id] = {
                        id: row.pitanje_id,
                        regija: row.regija,
                        grupa: row.grupa,
                        tekst_de: row.pitanje_tekst_de,
                        tekst_hr: row.pitanje_tekst_hr,
                        slika_url: row.slika_url,
                        odgovori: []
                    };
                }
                pitanjaPoRegiji[row.regija][row.pitanje_id].odgovori.push({
                    id: row.odgovor_id,
                    tekst_de: row.odgovor_tekst_de,
                    tekst_hr: row.odgovor_tekst_hr,
                    tocan: row.tocan
                });
            });

            // Za svaku regiju uzmi N random pitanja, redom po regiji
            let questionsArray = [];
            regija.forEach(r => {
                let pitanjaArr = Object.values(pitanjaPoRegiji[r] || {});
                console.log(`Regija: ${r}, pronađeno pitanja: ${pitanjaArr.length}`);
                pitanjaArr = pitanjaArr.sort(() => Math.random() - 0.5);
                const odabrana = pitanjaArr.slice(0, brojPitanjaPoRegiji);
                questionsArray.push(...odabrana);
            });
console.log('Vraćam pitanja (simulacija):', questionsArray.map(q => ({ id: q.id, regija: q.regija })));
            res.json(questionsArray);
            return;
        }

        // Standardni način: podrška za više regija i broj pitanja
        let queryText = `
            SELECT
                p.id AS pitanje_id,
                p.regija,
                p.grupa,
                p.tekst_de AS pitanje_tekst_de,
                p.tekst_hr AS pitanje_tekst_hr,
                p.slika_url,
                o.id AS odgovor_id,
                o.tekst_de AS odgovor_tekst_de,
                o.tekst_hr AS odgovor_tekst_hr,
                o.tocan
            FROM
                pitanja p
            JOIN
                odgovori o ON p.id = o.pitanje_id
        `;
        const queryParams = [];

        // Podrška za više regija
        if (regija && regija !== 'all') {
            if (!Array.isArray(regija)) {
                regija = [regija];
            }
            const placeholders = regija.map((_, i) => `$${i + 1}`).join(', ');
            queryText += ` WHERE p.regija IN (${placeholders})`;
            queryParams.push(...regija);
        }

        queryText += ` ORDER BY p.id, o.id;`;

        const result = await pool.query(queryText, queryParams);

        const questionsMap = new Map();
        result.rows.forEach(row => {
            if (!questionsMap.has(row.pitanje_id)) {
                questionsMap.set(row.pitanje_id, {
                    id: row.pitanje_id,
                    regija: row.regija,
                    grupa: row.grupa,
                    tekst_de: row.pitanje_tekst_de,
                    tekst_hr: row.pitanje_tekst_hr,
                    slika_url: row.slika_url,
                    odgovori: []
                });
            }
            questionsMap.get(row.pitanje_id).odgovori.push({
                id: row.odgovor_id,
                tekst_de: row.odgovor_tekst_de,
                tekst_hr: row.odgovor_tekst_hr,
                tocan: row.tocan
            });
        });

        let questionsArray = Array.from(questionsMap.values());

        // Koristi broj iz query parametra ili default na 360
        const numberOfQuestions = parseInt(broj, 10) || 360;
        if (questionsArray.length > numberOfQuestions) {
            questionsArray = questionsArray.sort(() => 0.5 - Math.random()).slice(0, numberOfQuestions);
        } else if (questionsArray.length < numberOfQuestions && regija && regija !== 'all') {
            console.warn(`Nema dovoljno pitanja (${questionsArray.length}) za odabrane regije.`);
        }

        questionsArray.sort((a, b) => a.id - b.id);

        res.json(questionsArray);
    } catch (error) {
        console.error('Greška pri dohvaćanju kviz pitanja s filtrom:', error);
        res.status(500).json({ message: 'Greška pri dohvaćanju kviz pitanja.' });
    }
});

app.get('/api/regije', async (req, res) => {
    try {
        // Dohvaćanje jedinstvenih regija iz 'pitanja' tablice
        const result = await pool.query('SELECT DISTINCT regija FROM pitanja ORDER BY regija;');
        res.json(result.rows); // Vraća [{ regija: 'Bayern' }, { regija: 'Hessen' }, ...]
    } catch (error) {
        console.error('Fehler beim Abrufen der Regionen:', error);
        res.status(500).json({ message: 'Fehler beim Abrufen der Regionen.' });
    }
});

// --- Nova ruta za unos pitanja iz Google Sheeta ---
app.post('/api/unos-pitanja', async (req, res) => {
    const { questions } = req.body; // Očekujemo array objekata pitanja iz Google Apps Scripta

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ message: 'Nema podataka o pitanjima za unos.' });
    }

    const client = await pool.connect(); // Koristimo transakciju za atomicni unos
    try {
        await client.query('BEGIN'); // Pokreni transakciju

        for (const questionData of questions) {
            const {
                regija,
                grupa,
                tekst_hr,
                tekst_de,
                slika_url,
                odgovori
            } = questionData;

            // Unos pitanja
            const questionInsertQuery = `
                INSERT INTO pitanja (regija, grupa, tekst_hr, tekst_de, slika_url)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id;
            `;
            const questionResult = await client.query(questionInsertQuery, [
                regija || 'Regija 01', // Default ako regija nije definirana
                grupa || 'Općenito',   // Default ako grupa nije definirana
                tekst_hr,
                tekst_de,
                slika_url || null
            ]);
            const pitanjeId = questionResult.rows[0].id;

            // Unos odgovora
            for (const odgovor of odgovori) {
                const answerInsertQuery = `
                    INSERT INTO odgovori (pitanje_id, tekst_hr, tekst_de, tocan)
                    VALUES ($1, $2, $3, $4);
                `;
                await client.query(answerInsertQuery, [
                    pitanjeId,
                    odgovor.tekst_hr,
                    odgovor.tekst_de,
                    odgovor.tocan
                ]);
            }
        }

        await client.query('COMMIT'); // Potvrdi transakciju
        res.status(201).json({ message: 'Pitanja uspješno unesena!', count: questions.length });

    } catch (error) {
        await client.query('ROLLBACK'); // Poništi transakciju u slučaju greške
        console.error('Greška pri unosu pitanja iz Google Sheeta:', error);
        res.status(500).json({ message: 'Greška pri unosu pitanja.', error: error.message });
    } finally {
        client.release(); // Oslobodi klijent iz poola
    }
});

// Pokretanje servera
app.listen(port, () => {
    console.log(`Server pokrenut na http://localhost:${port}`);
    console.log('Otvori u pregledniku za unos/pregled pitanja.');
});