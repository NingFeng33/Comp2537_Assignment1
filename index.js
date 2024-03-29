require("./units.js");

require('dotenv').config();

const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');
const saltRounds = 12;

const port = process.env.PORT || 3000;
const app = express();
const Joi = require('joi');

const expireTime = 1 * 60 * 60 * 1000;

const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_database = process.env.MONGODB_DATABASE;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;

const node_session_secret = process.env.NODE_SESSION_SECRET;

var {database} = include('databaseConnection');

const userCollection = database.db(mongodb_database).collection('users');

app.use(express.urlencoded({extended: false}));

var mongoStore = MongoStore.create({
	    mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/sessions`,
	    crypto: {
			     secret: mongodb_session_secret
		}
});

app.use(session({
	    secret: node_session_secret,
	        store: mongoStore,
	        saveUninitialized: false,
			resave: true,
}
));

app.get('/', (req, res) => {
	res.send(`
        <h1>Ning's Page</h1>
        <ul>
            <li><a href="/SignUp">Sign Up</a></li>
            <li><a href="/login">Log in</a></li>
        </ul>
    `);
});

app.get('/nosql-injection', async (req,res) => {
	var username = req.query.user;

	if (!username) {
		res.send(`<h3>no user provided - try /nosql-injection?user=name</h3> <h3>or /nosql-injection?user[$ne]=name</h3>`);
		return;
	}
	console.log("user: "+username);

	const schema = Joi.string().max(20).required();
	const validationResult = schema.validate(username);

	//If we didn't use Joi to validate and check for a valid URL parameter below
	// we could run our userCollection.find and it would be possible to attack.
	// A URL parameter of user[$ne]=name would get executed as a MongoDB command
	// and may result in revealing information about all users or a successful
	// login without knowing the correct password.
	if (validationResult.error != null) {  
	   console.log(validationResult.error);
	   res.send("<h1 style='color:darkred;'>A NoSQL injection attack was detected!!</h1>");
	   return;
	}	

	const result = await userCollection.find({username: username}).project({username: 1, password: 1, _id: 1}).toArray();

	console.log(result);

    res.send(`<h1>Hello ${username}</h1>`);
});

app.get('/about', (req,res) => {
    var color = req.query.color;

    res.send("<h1 style='color:"+color+";'>Ning Feng</h1>");
});

app.get('/contact', (req,res) => {
    var missingEmail = req.query.missing;
    var html = `
        email address:
        <form action='/submitEmail' method='post'>
            <input name='email' type='text' placeholder='email'>
            <button>Submit</button>
        </form>
    `;
    if (missingEmail) {
        html += "<br> email is required";
    }
    res.send(html);
});

app.post('/submitEmail', (req,res) => {
    var email = req.body.email;
    if (!email) {
        res.redirect('/contact?missing=1');
    }
    else {
        res.send("Thanks for subscribing with your email: "+email);
    }
});


app.get('/SignUp', (req,res) => {
    var html = `
    Sign Up
    <form action='/submitUser' method='post'>
    <input name='username' type='text' placeholder='username'>
	<br>
	<input name = 'email' type='text' placeholder='email'>
	<br>
    <input name='password' type='password' placeholder='password'>
	<br>
    <button>Submit</button>
    </form>
    `;
    res.send(html);
});


app.get('/login', (req,res) => {
	// res.render('login', { errorMessage: '' });
    var html = `
    Log in
    <form action='/loggingin' method='post'>
    <input name='username' type='text' placeholder='username'>
    <input name='password' type='password' placeholder='password'>
    <button>Submit</button>
    </form>
    `;
    res.send(html);
	
});

app.post('/submitUser', async (req,res) => {
    var username = req.body.username;
	var email = req.body.email;
    var password = req.body.password;

	const schema = Joi.object(
		{
			username: Joi.string().alphanum().max(20).required(),
			email: Joi.string().email().required(),
			password: Joi.string().max(20).required()
		});
	
	const validationResult = schema.validate({username, email, password});
	if (validationResult.error != null) {
	   console.log(validationResult.error);
	   res.redirect("/SignUp");
	   return;
   }

    var hashedPassword = await bcrypt.hash(password, saltRounds);
	
	await userCollection.insertOne({username: username, email: email, password: hashedPassword});
	console.log("Inserted user");
	var randomNum = Math.floor(Math.random() * 3) + 1;
  res.redirect('/pic/' + randomNum);
});

app.get('/pic/:id', (req, res) => {
  var pic = req.params.id;

  // Generate a random number between 1 and 3
  var randomNum = Math.floor(Math.random() * 3) + 1;

  if (pic == 1 || randomNum == 1) {
    var html = `
      <div>
        <h1>Hello Ning</h1>
        <img src='/pic1.png' style='width:500px;'>
        <form action='/signOut' method='post'>
          <button>Sign Out</button>
        </form>
      </div>
    `;
    res.send(html);
  } else if (pic == 2 || randomNum == 2) {
    var html = `
      <div>
        <h1>Hello Ning</h1>
        <img src='/pic2.png' style='width:500px;'>
        <form action='/signOut' method='post'>
          <button>Sign Out</button>
        </form>
      </div>
    `;
    res.send(html);
  } else if (pic == 3 || randomNum == 3) {
    var html = `
      <div>
        <h1>Hello Ning</h1>
        <img src='/pic3.png' style='width:500px;'>
        <form action='/signOut' method='post'>
          <button>Sign Out</button>
        </form>
      </div>
    `;
    res.send(html);
  } else {
    res.send('Invalid pic id: ' + pic);
  }
    // var html = "successfully created user";
    // res.send(html);
	// var html = `
	// 	<div>
	// 		<h1>Hello Ning</h1>
	// 		<img src='/pic2.png' style='width:500px;'>
	// 		<form action='/signOut' method='post'>
	// 		<button>Sign Out</button>
	// 		</form>
	// 	</div>
	// 	`;
	// 	res.send(html);
});

app.post('/loggingin', async (req,res) => {
    var username = req.body.username;
    var password = req.body.password;

	const schema = Joi.string().max(20).required();
	const validationResult = schema.validate(username);
	if (validationResult.error != null) {
	   console.log(validationResult.error);
	   res.redirect("/login");
	   return;
	}

	const result = await userCollection.find({username: username}).project({username: 1, password: 1, _id: 1}).toArray();

	console.log(result);
	if (result.length != 1) {
		console.log("user not found");
		res.redirect("/login");
		return;
	}
	if (await bcrypt.compare(password, result[0].password)) {
		console.log("correct password");
		req.session.authenticated = true;
		req.session.username = username;
		req.session.cookie.maxAge = expireTime;

		res.redirect('/loggedIn');
		return;
	}
	else {
		// console.log("incorrect password");
		const errorMessage = "Invalid email/password combination";
    	console.log(errorMessage);
    	res.render("login", { errorMessage });
		res.redirect("/login");
		return;
	}
});

app.get('/loggedin', (req,res) => {
    if (!req.session.authenticated) {
        res.redirect('/login');
    }
    // var html = `
    // You are logged in!
    // `;
    // res.send(html);
	res.redirect('/pic/1')
});

app.get('/logout', (req,res) => {
	req.session.destroy();
    var html = `
    You are logged out.
    `;
    res.send(html);
});

app.get('/pic/:id', (req, res) => {

	var pic = req.params.id;
	
	// Generate a random number between 1 and 3
	var randomNum = Math.floor(Math.random() * 3) + 1;
  
	if (pic == 1 || randomNum == 1) {
	  var html = `
		<div>
		  <h1>Hello Ning</h1>
		  <img src='/pic1.png' style='width:500px;'>
		  <form action='/signOut' method='post'>
			<button>Sign Out</button>
		  </form>
		</div>
	  `;
	  res.send(html);
	} else if (pic == 2 || randomNum == 2) {
	  var html = `
		<div>
		  <h1>Hello Ning</h1>
		  <img src='/pic2.png' style='width:500px;'>
		  <form action='/signOut' method='post'>
			<button>Sign Out</button>
		  </form>
		</div>
	  `;
	  res.send(html);
	} else if (pic == 3 || randomNum == 3) {
	  var html = `
		<div>
		  <h1>Hello Ning</h1>
		  <img src='/pic3.png' style='width:500px;'>
		  <form action='/signOut' method='post'>
			<button>Sign Out</button>
		  </form>
		</div>
	  `;
	  res.send(html);
	} else {
	  res.send("Invalid pic id: " + pic);
	}
  });
  

// app.get('/pic/:id', (req,res) => {

//     var pic = req.params.id;

//     if (pic == 1) {
//         // 
// 		var html = `
//     <div>
// 		<h1>Hello Ning</h1>
//         <img src='/pic1.png' style='width:500px;'>
//         <form action='/signOut' method='post'>
//         <button>Sign Out</button>
//         </form>
//     </div>
//     `;
//     res.send(html);
//     }
//     else if (pic == 2) {
//         // res.send("pic2: <img src='/pic2.png' style='width:500px;'>");
// 		var html = `
// 		<div>
// 			<h1>Hello Ning</h1>
// 			<img src='/pic2.png' style='width:500px;'>
// 			<form action='/signOut' method='post'>
// 			<button>Sign Out</button>
// 			</form>
// 		</div>
// 		`;
// 		res.send(html);
//     }
// 	else if (pic == 3) {
// 		// res.send("pic3: <img src='/pic3.png' style='width:500px;'>");
// 		var html = `
// 		<div>
// 			<h1>Hello Ning</h1>
// 			<img src='/pic3.png' style='width:500px;'>
// 			<form action='/signOut' method='post'>
// 			<button>Sign Out</button>
// 			</form>
// 		</div>
// 		`;
// 		res.send(html);
// 	}
//     else {
//         res.send("Invalid pic id: "+ pic);
//     }
// });

app.post('/signout', (req, res) => {
	// clear session and redirect to signup page
	req.session.destroy(() => {
	  res.redirect('/');
	});
  });

app.use(express.static(__dirname + "/public"));

app.get("*", (req,res) => {
	res.status(404);
	res.send("Page not found - 404");
})

app.listen(port, () => {
	console.log("Node application listening on port "+port);
}); 
