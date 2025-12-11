const express = require('express')
const cors = require('cors');
const app = express()
require('dotenv').config()
const { MongoClient, ServerApiVersion } = require('mongodb');
const port = process.env.PORT || 3000



// --------------middleware starts here----------

app.use(express.json());
app.use(cors());



// --------------middleware ends here----------

// MongoDB
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.2iksbit.mongodb.net/?appName=Cluster0`;

// Mongodb client

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const db = client.db('local_chef_bazaar_db')
        const mealsCollection = db.collection('meals')
        const bannerCollection = db.collection('banners')


        //Meals collection

        // Latest Meals
        app.get('/latest-meals', async (req, res) => {
            const cursor = mealsCollection.find().sort({ created_at: -1 }).limit(6)
            const result = await cursor.toArray()
            res.send(result)
        })

        // Meals
        app.get('/meals', async (req, res) => {
            const order = req.query.order ? (req.query.order === 'asc' ? 1 : -1) : null;


            if (order) {
                const cursor = mealsCollection.find().sort({ price: order, created_at: -1 })
                const result = await cursor.toArray()
                res.send(result)
            } else {
                const cursor = mealsCollection.find().sort({ created_at: -1 })
                const result = await cursor.toArray()
                res.send(result)

            }

        })



        app.post('/meals', async (req, res) => {
            const meals = req.body
            const result = await mealsCollection.insertOne(meals)
            res.send(result)
        })


        // Meals Collection ends here


        //Banners Collection
        app.get('/banners', async (req, res) => {
            const cursor = bannerCollection.find()
            const result = await cursor.toArray()
            res.send(result)
        })


        app.post('/banners', async (req, res) => {
            const banners = req.body
            const result = await bannerCollection.insertMany(banners)
            res.send(result)
        })




        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('Local Chef Bazaar Server Running!')
})

app.listen(port, () => {
    console.log(`Listening from port ${port}`)
})