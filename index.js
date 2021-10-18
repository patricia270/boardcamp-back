import express from 'express';
import cors from 'cors';
import pg from 'pg';
import { json } from 'express';


const server = express();

const { Pool } = pg;

const connectionData = {
    user: 'bootcamp_role',
    password: 'senha_super_hiper_ultra_secreta_do_role_do_bootcamp',
    host: 'localhost',
    port: 5432,
    database: 'boardcamp'
}

const connection = new Pool(connectionData);

server.use(cors());
server.use(json());

server.get('/categories', async (req, resp) => {
    try {
        const result = await connection.query('SELECT * FROM categories;');  
        resp.send(result.rows);
    }
    catch (error) {
        resp.sendStatus(500);
    }
})

server.post('/categories', async (req, resp) => {
    const { name } = req.body;

    if(!name || name.length === 0) {
        return resp.sendStatus(400);    
    }

    try {
        const nameCheck = await connection.query('SELECT * FROM categories WHERE name = $1', [name]);
        if(nameCheck.rows.length !== 0) {
            return resp.sendStatus(409);
          }
        await connection.query('INSERT INTO categories (name) VALUES ($1);', [name]);
        return resp.sendStatus(201);
    }
    catch (error){
        return resp.sendStatus(500);
    }  
})

server.get('/games', async (req, resp) => {
    const name = req.query.name;
    try {
        if (name) {
            const filteredResult = await connection.query('SELECT * FROM games WHERE name ILIKE $1;', [`${name}%`]);
            return resp.send(filteredResult.rows);
        }
        const result = await connection.query('SELECT * FROM games;');
        return resp.send(result.rows);
    }
    catch (error) {
        resp.sendStatus(500);
    }
})

server.post('/games', async (req, resp) => {
    const {
        name,
        image,
        stockTotal,
        categoryId,
        pricePerDay
    } = req.body;

    if(!name || name.length === 0 || stockTotal === 0 || pricePerDay === 0) {
        return resp.sendStatus(400);    
    }

    try {
        const idCheck = await connection.query('SELECT id FROM categories WHERE id=$1;', [categoryId]);
        if(idCheck.rows.length === 0){
            return resp.sendStatus(400);
        }

        const gameCheck = await connection.query('SELECT * FROM games WHERE name = $1;', [name]);
        if(gameCheck.rows.length !== 0) {
            return resp.sendStatus(409);
          }
        await connection.query('INSERT INTO games (name, image, "stockTotal","categoryId", "pricePerDay") VALUES ($1, $2, $3, $4, $5);', [name, image, stockTotal, categoryId, pricePerDay]);
        return resp.sendStatus(201);
    }
    catch (error){
        return resp.sendStatus(500);
    }  
})

server.get('/customers', async (req, resp) => {
    const cpf = req.query.cpf;
    try {
        if (cpf) {
            const filteredResult = await connection.query('SELECT * FROM customers WHERE cpf ILIKE $1;', [`${cpf}%`]);
            return resp.send(filteredResult.rows);
        }
        const result = await connection.query('SELECT * FROM customers;');
        return resp.send(result.rows);
    }
    catch (error) {
        resp.sendStatus(500);
    }
})

server.get('/customers/:id', async (req, resp) => {
    const { id } = req.params;
    
    try {
        const result = await connection.query('SELECT * FROM customers WHERE id=$1;', [id]);
        if(result.rows.length === 0) {
            return resp.sendStatus(404);
        }
        return resp.send(result.rows);
    }
    catch (error) {
        resp.sendStatus(500);
    }
})

server.listen(4000);