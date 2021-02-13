const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const app = express();
const fs = require('fs');
const imgur = require('imgur');
const randomstring = require("randomstring");
const { MongoClient } = require('mongodb');

const uri = process.env.MONGOURI;
var client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
var database;
client.connect(async function (err) {
  if (err) throw err;
  database = client.db('revista');
});

imgur.setClientId(process.env.IMGURID);
imgur.setAPIUrl(process.env.IMGURURL);
imgur.setCredentials(process.env.IMGURCRDMAIL, process.env.IMGURCRDPASS, process.env.IMGURPASS);


app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(cookieParser(process.env.SECRET));
app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 10000
  }
}));

app.use(express.urlencoded({ extended: true }));


app.use(express.static(path.join(__dirname, 'public')));

var storage = multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, './public/img/tmp');
  },
  filename: function (req, file, callback) {
    callback(null, file.originalname);
  }
});
var upload = multer({ storage: storage }).single('image');

app.get('/', async (req, res) => {
  console.log(req.path);
  var cookies = database.collection('cookies');
  var articles = database.collection('articles')
  arts = await articles.find({}).toArray();
  arts.slice(0, 8);
  if (req.signedCookies == null) {
    res.render("index", { a: true, sub: false, art: arts });
    console.log(req.url);
    return;
  }
  auser = await cookies.findOne({ cstring: req.signedCookies['cooked'] });
  if (auser == null) {
    res.render("index", { a: true, sub: false, art: arts });
    return;
  }
  if (req.signedCookies['cooked'] == auser.cstring) {
    res.render("index", {
      art: arts,
      a: true, sub: false,
      login: {
        username: auser.user
      }
    });
  } else {
    res.render("index", { a: true, sub: false, art: arts });
  }
});

app.get('/articol/:alink/', async (req, res) => {
  var articles = database.collection('articles');
  art = await articles.findOne({ link: req.params.alink });
  res.render("articol", {
    arts: art
  })
});
app.get('/topic/:atopic', async (req, res) => {
  var articles = database.collection('articles');
  arts = await articles.find({ topic: req.params.atopic }).toArray();
  if (arts == null) {
    res.render("index", { a: false, sub: true });
  }
  res.render("index", {
    a: true, sub: true,
    topic: req.params.atopic,
    art: arts
  });
});
app.get('/redactor', async (req, res) => {
  cookies = database.collection('cookies');
  if (req.signedCookies == null || req.signedCookies['cooked'] == null) {
    res.redirect("login");
    return;
  }
  auser = await cookies.findOne({ cstring: req.signedCookies['cooked'] });
  console.log(auser);
  if (auser == null) {
    res.redirect("login");
    return;
  }
  res.render("redactor", {
    redirect: false
  });
});

app.post('/redactor', async (req, res) => {
  var cookie = database.collection('cookies');
  if (req.signedCookies == null || req.signedCookies['cooked'] == null) {
    res.redirect("login");
    return;
  }
  auser = await cookies.findOne({ cstring: req.signedCookies['cooked'] });
  if (auser == null) {
    res.redirect("login");
    return;
  }

  var lsc = req.body;
  console.log(lsc);

  var blink = req.body.title;
  console.log(blink);
  d = new Date();
  blink = blink.replace(/\s+/g, '-').toLowerCase();
  lsc.date = d.toLocaleDateString("eu-de");
  lsc.link = blink;
  lsc.content = lsc.acontent;
  lsc.online = 0;
  lsc.creator = auser.user;
  delete lsc.acontent;
  console.log(lsc);

  var articles = database.collection('articles');

  articles.insertOne(lsc, function (err, res) {
    if (err) throw err;
    console.log("Document inserted");
  });

  res.render("redactor", {
    redirect: true,
    succes: true
  });
});

app.get('/login', async (req, res) => {
  var cookies = database.collection('cookies');
  if (req.signedCookies == null) {
    res.render("login");
    return;
  }
  auser = await cookies.findOne({ cstring: req.signedCookies['cooked'] });
  if (auser == null) {
    res.render("login");
    return;
  }
  res.redirect('/');
})

app.post('/login', async (req, res) => {
  var users = database.collection('users');
  var cookies = database.collection('cookies');

  auser = await users.findOne({ user: req.body.user });
  if (auser == null) {
    res.render("login", {
      fail: true
    });
    return;
  }
  if (auser.password != req.body.password) {
    res.render("login", {
      fail: true
    });
    return;
  }

  var gencookie = randomstring.generate(32);
  /*var delQuery = { user: req.body.user };
  cookies.deleteMany(delQuery, function(err, obj) {
    if (err) throw err;
    console.log("Cookies for "+req.body.user+": reset");
  }); */
  res.cookie('cooked', gencookie, { signed: true });
  asc = {
    user: req.body.user,
    cstring: gencookie
  };
  cookies.insertOne(asc, function (err, res) {
    if (err) throw err;
    console.log("Cookie for " + req.body.user + " added.");
  });
  res.redirect("/");
});


app.post('/img-up', async (req, res) => {
  upload(req, res, async function (err) {
    if (err) {
      console.log(err);
      res.status(400);
    } else {
      var FileName = req.file.filename;
      var link;
      await imgur.uploadFile('./public/img/tmp/' + FileName)
        .then(function (json) {
          link = json.data.link;
        })
        .catch(function (err) {
          console.error(err.message);
        });
      res.send({
        status: 202,
        link: link
      })
      cleanImages();
    }
  })
});

function cleanImages() {
  var directory = './public/img/tmp/';
  fs.readdir(directory, (err, files) => {
    if (err) throw err;
    for (const file of files) {
      fs.unlink(path.join(directory, file), err => {
        if (err) throw err;
      });
    }
  });
}
app.get((req, res) => {
  res.redirect('/');
})

app.listen(3000, () => console.log('server started'));