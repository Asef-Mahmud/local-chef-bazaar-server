const express = require('express')
const cors = require('cors');
const app = express()
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 3000


// Firebase admin sdk
const admin = require("firebase-admin");

const serviceAccount = require("./local-chef-bazaar-4-all-firebase-adminsdk.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});




// --------------middleware starts here----------

app.use(express.json());
app.use(cors());


// Firebase Token Verification

const verifyFireBaseToken = async (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ message: 'Unauthorized Access' })
    }

    // If token exists -->  verification
    const token = authorization.split(' ')[1];
    try {
        const decoded = await admin.auth().verifyIdToken(token);
        console.log('inside firebaseToken', decoded)
        req.token_email = decoded.email;

        next();
    }

    catch (error) {
        return res.status(401).send({ message: 'Unauthorized Access' })
    }


}

//---------------MIDDLEWARE ENDS HERE--------------




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
        const reviewsCollection = db.collection('reviews')
        const favoritesCollection = db.collection('favorites')
        const ordersCollection = db.collection('orders')
        const usersCollection = db.collection('users')
        const roleRequestCollection = db.collection('roleRequest')



        //Middleware 

        // Middleware to verify admin

        const verifyAdmin = async (req, res, next) => {
            const email = req.token_email;

            const query = { userEmail: email };
            const user = await usersCollection.findOne(query)

            if (!user || user.role !== 'admin') {
                return res.status(403).send({ message: 'forbidden access' })
            }

            next()
        }


        //Middleware to verify Chef

        const verifyChef = async (req, res, next) => {
            const email = req.token_email;

            const query = { userEmail: email };
            const user = await usersCollection.findOne(query)

            if (!user || user.role !== 'chef') {
                return res.status(403).send({ message: 'forbidden access' })
            }

            next()
        }

        //Middleware ends here


        //Banners Collection---------------


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

        // Banner collection ends here----------------


        //User collection starts here-----------------

        app.post('/users', async (req, res) => {
            const user = req.body
            user.role = "user"
            user.status = "active"

            const result = await usersCollection.insertOne(user)
            res.send(result)
        })

        app.get('/users/:email', verifyFireBaseToken, async (req, res) => {
            const email = req.params.email;
            const query = { userEmail: email }
            const user = await usersCollection.findOne(query);
            res.send(user)
        })




        // Role check and access ----------
        app.get('/users/:email/role', verifyFireBaseToken, async (req, res) => {
            const email = req.params.email;
            const query = { userEmail: email }
            const user = await usersCollection.findOne(query);
            res.send({ role: user?.role || 'user' })
        })



        //User Collection ends here --------------------




        //Meals collection-------------------

        // Latest Meals
        app.get('/latest-meals', async (req, res) => {
            const cursor = mealsCollection.find().sort({ created_at: -1 }).limit(6)
            const result = await cursor.toArray()
            res.send(result)
        })

        // Meals

        // 1.Get (all)
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


        //1.1. get (one)
        app.get('/meal-details/:id', verifyFireBaseToken, async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await mealsCollection.findOne(query)
            res.send(result)
        })




        // Meals Collection ends here-----------------


        // Order related collection

        app.post('/order', verifyFireBaseToken, async (req, res) => {
            const order = req.body;

            if (order.status === 'fraud') {
                return res.status(403).send({ message: "Fraud users cannot place orders" });
            }
            order.orderTime = Date.now();

            const result = await ordersCollection.insertOne(order)
            res.send(result)
        })


        //Reviews Collection

        app.post('/review', verifyFireBaseToken, async (req, res) => {
            const review = req.body;
            review.timestamp = Date.now();

            const result = await reviewsCollection.insertOne(review)
            res.send(result)

        })

        // This is for home page
        app.get('/reviews', async (req, res) => {
            const cursor = reviewsCollection.find().sort({ timestamp: -1 })
            const result = await cursor.toArray()
            res.send(result)
        })


        app.get('/reviews/:mealId', verifyFireBaseToken, async (req, res) => {
            const mealId = req.params.mealId
            const query = { mealId: mealId }
            const cursor = reviewsCollection.find(query).sort({ timestamp: -1 })
            const result = await cursor.toArray()
            res.send(result)
        })
        //Review Collection ends here


        //Favorites collection starts here

        app.get('/favorites/check/:mealId', verifyFireBaseToken, async (req, res) => {
            const { mealId } = req.params;
            const { email } = req.query;

            const exists = await favoritesCollection.findOne({ mealId, userEmail: email });
            res.send({ isFavorite: !!exists });
        });

        app.post('/favorites', async (req, res) => {
            const favorite = req.body
            favorite.addedTime = Date.now();
            const result = await favoritesCollection.insertOne(favorite)
            res.send(result)
        })


        app.delete('/favorites/:mealId', verifyFireBaseToken, async (req, res) => {

            const mealId = req.params.mealId;
            const userEmail = req.query.email;

            const query = { mealId, userEmail }
            const result = await favoritesCollection.deleteOne(query)
            res.send(result)
        })

        // Favorites collection ends here


        //DASHBOARD

        // USER

        // ROLEREQUEST COLLECTION

        app.post('/role-requests', verifyFireBaseToken, async (req, res) => {
            const { userName, userEmail, requestType } = req.body;

            const existingRequest = await roleRequestCollection.findOne({
                userEmail,
                requestStatus: "pending"
            });

            if (existingRequest) {
                return res.status(400).send({
                    message: "You already have a pending request"
                });
            }

            const requestData = {
                userName,
                userEmail,
                requestType,
                requestStatus: "pending",
                requestTime: new Date(),
            };

            const result = await roleRequestCollection.insertOne(requestData);
            res.send(result);
        });


        //get my-order
        app.get('/my-orders/:email', verifyFireBaseToken, async (req, res) => {
            const email = req.params.email;
            const query = { userEmail: email }

            const cursor = ordersCollection.find(query).sort({ orderTime: -1 })
            const result = await cursor.toArray()
            res.send(result)

        })

        //get my reviews
        app.get('/my-reviews/:email', verifyFireBaseToken, async (req, res) => {
            const email = req.params.email;
            const query = { userEmail: email }

            const cursor = reviewsCollection.find(query).sort({ orderTime: -1 })
            const result = await cursor.toArray()
            res.send(result)

        })

        //delete my reviews

        app.delete('/delete-review/:id', verifyFireBaseToken, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await reviewsCollection.deleteOne(query)
            res.send(result)
        })

        // Update my reviews
        app.patch('/update-my-review/:id', verifyFireBaseToken, async (req, res) => {
            const id = req.params.id;
            const updatedReview = req.body;
            const query = { _id: new ObjectId(id) }

            const update = {
                $set: {
                    comment: updatedReview.comment,
                    rating: updatedReview.rating
                }
            }

            const result = await reviewsCollection.updateOne(query, update)
            res.send(result)
        })


        //my Fav 
        //get
        app.get('/my-favs/:email', verifyFireBaseToken, async (req, res) => {
            const email = req.params.email;
            const query = { userEmail: email }

            const cursor = favoritesCollection.find(query).sort({ orderTime: -1 })
            const result = await cursor.toArray()
            res.send(result)

        })


        //delete

        app.delete('/delete-fav/:id', verifyFireBaseToken, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await favoritesCollection.deleteOne(query)
            res.send(result)
        })


        //CHEF 
        //Create meal

        // 2. Post my meal

        app.post('/meal', verifyFireBaseToken, verifyChef, async (req, res) => {
            const meal = req.body;

            if (meal.status === 'fraud') {
                return res.status(403).send({ message: "Fraud chefs cannot add meals" });
            }

            meal.created_at = Date.now()
            const result = await mealsCollection.insertOne(meal)
            res.send(result)
        })


        //3. Get my-meal 

        app.get('/my-meals/:email', verifyFireBaseToken, verifyChef, async (req, res) => {
            const email = req.params.email;
            const query = { userEmail: email }

            const cursor = mealsCollection.find(query).sort({ orderTime: -1 })
            const result = await cursor.toArray()
            res.send(result)

        })


        //4. Delete my meal

        app.delete('/delete-my-meal/:id', verifyFireBaseToken, verifyChef, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await mealsCollection.deleteOne(query)
            res.send(result)
        })

        // 5. Update My meal 
        app.patch('/update-my-meal/:id', verifyFireBaseToken, verifyChef, async (req, res) => {
            const id = req.params.id;
            const updatedMeal = req.body;
            const query = { _id: new ObjectId(id) }

            const update = {
                $set: {
                    foodName: updatedMeal.foodName,
                    chefName: updatedMeal.chefName,
                    foodImage: updatedMeal.foodImage,
                    price: updatedMeal.price,
                    rating: updatedMeal.rating,
                    ingredients: updatedMeal.ingredients,
                    deliveryArea: updatedMeal.deliveryArea,
                    estimatedDeliveryTime: updatedMeal.estimatedDeliveryTime,
                    chefExperience: updatedMeal.chefExperience
                }
            }

            const result = await mealsCollection.updateOne(query, update)
            res.send(result)
        })



        // 6. Get orders for chef
        app.get('/orders/:chefId', verifyFireBaseToken, verifyChef, async (req, res) => {
            const chefId = req.params.chefId
            const query = { chefId: chefId }
            const cursor = ordersCollection.find(query).sort({ timestamp: -1 })
            const result = await cursor.toArray()
            res.send(result)
        })


        //7. Update status 
        app.patch('/orders/:orderId', verifyFireBaseToken, verifyChef, async (req, res) => {
            const id = req.params.orderId;
            const { status } = req.body;
            const query = { _id: new ObjectId(id) }

            const update = {
                $set: {
                    orderStatus: status,
                    updatedAt: new Date()
                }
            }

            const result = await ordersCollection.updateOne(query, update)
            res.send(result)
        })


        // Admin
        // Get users
        app.get('/users', verifyFireBaseToken, verifyAdmin, async (req, res) => {
            const cursor = usersCollection.find().sort({ created_at: -1 })
            const result = await cursor.toArray()
            res.send(result)
        })


        //User Set to Fraud

        app.patch('/users/make-fraud/:userId', verifyFireBaseToken, verifyAdmin, async (req, res) => {
            const id = req.params.userId;
            const query = { _id: new ObjectId(id) }

            const update = {
                $set: {
                    status: 'fraud',
                }
            }

            const result = await usersCollection.updateOne(query, update)
            res.send(result)
        })


        //









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