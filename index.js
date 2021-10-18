import express from 'express';
import cors from 'cors';
import pg from 'pg';
import Joi from 'joi';
import dayjs from 'dayjs';
import { json } from 'express';


const server = express();

const schemaCustomers = Joi.object({
    name: Joi.string().required(),
    phone: Joi.string().pattern(/^\(?[1-9]{2}\)? ?(?:[2-8]|9[1-9])[0-9]{3}\-?[0-9]{4}$/),
    cpf: Joi.string().pattern(/[0-9]{3}\.?[0-9]{3}\.?[0-9]{3}\-?[0-9]{2}/), 
    birthday: Joi.date().required()
});

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

server.post('/customers', async (req, resp) => {
    const {
        name,
        phone,
        cpf,
        birthday
    } = req.body;

    const { error, value} = schemaCustomers.validate({name, cpf, phone, birthday});
    if (error) {
        resp.sendStatus(400)
        return;
    }

    try {  
        const cpfCheck = await connection.query('SELECT * FROM customers WHERE cpf = $1;', [cpf]);
        if(cpfCheck.rows.length !== 0) {
            return resp.sendStatus(409);
          }   
        await connection.query('INSERT INTO customers (name, phone, cpf, birthday) VALUES ($1, $2, $3, $4);', [name, phone, cpf, birthday]);
        return resp.sendStatus(201);
    }
    catch (error){
        return resp.sendStatus(500);
    }  
})

server.put('/customers/:id', async (req, resp) => {
    const { id } = req.params;
    const {
        name,
        phone,
        cpf,
        birthday
    } = req.body;

    const { error, value} = schemaCustomers.validate({name, cpf, phone});
    if (error) {
        resp.sendStatus(400)
        return;
    }

    try {  
        const cpfCheck = await connection.query('SELECT * FROM customers WHERE cpf = $1;', [cpf]);
        if (cpfCheck.rows.length !== 0 && cpfCheck.rows[0].id !== Number(id)) {
            return resp.sendStatus(409);
        }  
        await connection.query('UPDATE customers SET name = $2 , phone = $3, cpf = $4, birthday = $5 WHERE id = $1;', [id, name, phone, cpf, birthday]);
        return resp.sendStatus(200);
    }
    catch (error){
        return resp.sendStatus(500);
    }  
})

server.get('/rentals', async (req, resp) => {
    const customerId = req.query.customerId;
    const gameId = req.query.gameId;
    try {
        const query = `
            SELECT rentals.*,
            jsonb_build_object('id', customers.id, 'name', customers.name) AS customer,
            jsonb_build_object('id', games.id, 'name', games.name, 'categoryId', games."categoryId", 'categoryName', categories.name) AS game
            FROM rentals
            JOIN customers ON rentals."customerId" = customers.id
            JOIN games ON rentals."gameId" = games.id
            JOIN categories ON categories.id = games."categoryId"
        `;
        
        let where = "";
        let values = [];

        if (customerId && gameId) {
            where = `WHERE rentals."customerId" = $1 AND rentals."gameId" = $2`;
            values.push(customerId, gameId);
        }else if (gameId) {
            where = 'WHERE rentals."gameId" = $1;';
            values.push(gameId);
        }else if (customerId) {
            where = 'WHERE rentals."customerId" = $1;';
            values.push(customerId);
        }

        const result = await connection.query(query+where, values);
        console.log(result.rows)
        resp.send(result.rows);
    }
    catch (error) {
        resp.sendStatus(500);
    }
})

server.post('/rentals', async (req, resp) => {
    const {
        customerId,
        gameId,
        daysRented
      } = req.body;

    try {  
        if(daysRented <= 0) {
            return resp.sendStatus(400);
        } 
        const client = await connection.query('SELECT * FROM customers WHERE id = $1', [customerId]);
        if(!client.rows[0]) {
            return resp.sendStatus(400);
        } 
        const game = await connection.query('SELECT * FROM games WHERE id = $1', [gameId]);
        if(!game.rows[0]) {
            return resp.sendStatus(400);
        }     
        const rentDate = dayjs(new Date()).format("YYYY-MM-DD");
        const originalPrice = daysRented * game.rows[0].pricePerDay;
       
        const rental = await connection.query('SELECT * FROM rentals WHERE "gameId" = $1 AND "returnDate" IS NULL', [gameId]);
        if(rental.rows.length >= game.rows[0].stockTotal) {
            return resp.sendStatus(400);
        } 

        await connection.query('INSERT INTO rentals ("customerId", "gameId", "rentDate", "daysRented", "originalPrice") VALUES ($1, $2, $3,$4, $5);',[customerId, gameId, rentDate, daysRented, originalPrice]);
            
        resp.sendStatus(201);
    }
    catch (error){
        return resp.sendStatus(500);
    }  
})

server.post('/rentals:id/return', async (req, resp) => {
    const { id } = req.params;

    try {  
        const rental = await connection.query('SELECT * FROM rentals WHERE id = $1', [id]);

        if(!rental.rows[0]) {
            return resp.sendStatus(404);
        } 
        if(rental.rows[0].returnDate) {
            return resp.sendStatus(400);
        } 
        const rentDate = dayjs(rental.rows[0].rentDate).format('YYYY-MM-DD');
        const returnDate = dayjs().format('YYYY-MM-DD');
        const daysRented = rental.rows[0].daysRented;
        const pricePerDay = rental.rows[0].originalPrice / daysRented;
        const daysDiff = dayjs(returnDate).diff(rentDate, 'hour') / 24;
        const delayFee =  daysDiff > daysRented ? (daysDiff - daysRented) * pricePerDay : 0;
        
        await connection.query('UPDATE rentals SET "returnDate" = $1, "delayFee" = $2 WHERE id = $3;', [returnDate, delayFee, id]);
        resp.sendStatus(200);
    }
    catch (error){
        return resp.sendStatus(500);
    }  
})

server.delete('/rentals/:id', async (req, resp) => {
    const { id } = req.params;
    try {  
        const rental = await connection.query('SELECT * FROM rentals WHERE id = $1', [id]);
        if(!rental.rows[0]) {
            return resp.sendStatus(404);
        }
        if(rental.rows[0].returnDate) {
            return resp.sendStatus(400);
        } 

        await connection.query('DELETE FROM rentals WHERE id = $1', [id]);
        resp.sendStatus(200);
    }
    catch (error){
        return resp.sendStatus(500);
    }  
})

server.listen(4000);