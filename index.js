import express from "express";
import cors from "cors";
import pg from "pg";
import { json } from "express";


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

server.get("/categories", async (req, resp) => {
    try {
        const result = await connection.query('SELECT * FROM categories;');  
        resp.send(result.rows);
    }
    catch (error) {
        resp.sendStatus(500);
    }
})

server.post("/categories", async (req, resp) => {
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

server.listen(4000);