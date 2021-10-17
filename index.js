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


server.listen(4000);