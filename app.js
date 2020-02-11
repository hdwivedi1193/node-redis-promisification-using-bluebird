const express= require("express")
const bodyParser=require("body-parser")
const redis=require("redis")
const hbs=require("hbs")
const path=require("path")
const cookieParser = require('cookie-parser');
const session = require('express-session');
const flash = require('express-flash');
const Promise = require('bluebird')
const bcrypt=require("bcrypt")
//Promisifies the entire object by going through the object's properties and creating an async equivalent of each function on the object and its prototype chain. 
Promise.promisifyAll(redis);


// Initialize app
const app=express()

// Initialize session,cookie and flash
const sessionStore = new session.MemoryStore;

app.use(cookieParser('secret'));
app.use(session({
    cookie: { maxAge: 60000 },
    store: sessionStore,
    saveUninitialized: true,
    resave: 'true',
    secret: 'secret'
}));
app.use(flash());

// if there's a flash message in the session request, make it available in the response, then delete it

app.use(function(req, res, next){
    res.locals.sessionFlash = req.session.sessionFlash;
    delete req.session.sessionFlash;
    next();
});
// Set template engine hbs

app.set('views', path.join(__dirname+"/public"));
app.set('view engine', 'hbs');


//Body Parser middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());


//setup port 
const port_redis = process.env.PORT || 6379;
const port = process.env.PORT || 3000;

// initialize redis

const client = redis.createClient(port_redis);


client.on('error', (err) => {
    console.log("Error " + err)
});


app.get('/',(req,res)=>{

    res.render('index')
})
//To store hashes (objects) in Redis
app.post("/register",async (req,res)=>{
    const userPass=await bcrypt.hash(req.body.password,8)

    client.hgetallAsync(req.body.email).then((reply)=>{
            if(reply!=null){
                
                req.session.sessionFlash = {
                    type: 'success',
                    message: 'User Already Exist.............'
                }
               return  res.redirect('/')

            }
            
            // Promise chaining
            return client.hmsetAsync(req.body.email, {
                'firstname': req.body.firstname,
                'lastname': req.body.lastname,
                'email': req.body.email,
                'phone':req.body.phone,
                'password': userPass
            })
              
    }).then((result)=>{

        req.session.sessionFlash = {
            type: 'success',
            message: 'User Created Successfully'
        }
       return res.redirect('/')

    }).catch((e)=>{
        return res.redirect('/')

    })

    

})

// To search user from redis using hash key

app.get('/searchUser',(req,res)=>{
client.hgetallAsync(req.query.search).then((object)=>{
    req.session.sessionFlash = {
        userFound: 'success',
        firstname:object.firstname,
        email: object.email
    }
    res.redirect('/')

    }).catch((e)=>{
        res.redirect('/')


    })
})

// To delete user from redis database using key
app.get('/deleteuser',(req,res)=>{
    client.delAsync(req.query.search).then((reply)=>{

        req.session.sessionFlash = {
            type: 'success',
            message: 'User Deleted Successfully'
        }
        res.redirect('/')
    }).catch((e)=>{
        res.redirect('/')

    })

})


app.listen(port,function(){

    console.log("Server running on Port: "+port)
})

