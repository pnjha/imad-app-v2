var express = require('express');  //Express frameork object
var morgan = require('morgan');  //Morgan Framework object
var path = require('path');
var Pool=require('pg').Pool;
var crypto = require('crypto');
var bodyParser = require('body-parser');
var session = require('express-session');


var app = express();
app.use(morgan('combined'));
app.use(bodyParser.json());
app.use(session({
    secret: 'nD8uJkp$m/nZ',
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 30,
      httpOnly: true,
    },
    resave:true,
    saveUninitialized:true

}));
var blogRootUser='Hariom';
var config={
      'prod':{
          user: 'hlbhariom',
          database: 'hlbhariom',
          host: 'db.imad.hasura-app.io',
          port: '5432',
          password: process.env.DB_PASSWORD
      },
      'dev': {
          user: 'hlbhariom',
          database: 'hlbhariom',
          host: 'localhost',
          port: '5432',
          password: 'password'
      }
};
var pool=new Pool(config.prod);

app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, 'ui', 'index.html'));
});
app.get('/manifest.appcache', function (req, res) {
  res.sendFile(path.join(__dirname, 'manifest.appcache'));
});
app.use(express.static('public'));
app.use('/ui',express.static(__dirname+'/ui'));
app.use('/css',express.static(__dirname+'/css'));
app.use('/js',express.static(__dirname+'/js'));
app.use('/jquery',express.static(__dirname+'/jquery'));
app.use('/font',express.static(__dirname+'/font'));
app.use('/image',express.static(__dirname+'/image'));

/*Functions here*/
var tagBody = '(?:[^"\'>]|"[^"]*"|\'[^\']*\')*';

var tagOrComment = new RegExp(
    '<(?:'
    // Comment body.
    + '!--(?:(?:-*[^->])*--+|-?)'
    // Special "raw text" elements whose content should be elided.
    + '|script\\b' + tagBody + '>[\\s\\S]*?</script\\s*'
    + '|style\\b' + tagBody + '>[\\s\\S]*?</style\\s*'
    // Regular name
    + '|/?[a-z]'
    + tagBody
    + ')>',
    'gi');

function escape(html) {
  var oldHtml="";
  do {
    oldHtml = html;
    html = html.replace(tagOrComment, '');
  } while (html !== oldHtml);
  return html.replace(/</g, '&lt;');
}

function jstring(s){
  return JSON.stringify(s);
}
function msg(message){
  return JSON.stringify({msg:message});
}


function articleListTemplate(articleData){
  var x=`<ul class="list-group">`;
  var li=`<li class="list-group-item list-group-item-info">`;
  var h4=`<h4 class="list-group-item-heading" style="display:inline-block;">`;
  for(i=0;i<articleData.length;i++){
        x += li+`<a href="#/blogs/${articleData[i].category}/${encodeURIComponent(articleData[i].title)}" data-toggle="modal" data-target="#articleModal" data-keyboard="true">`+h4+articleData[i].title+'</h4></a><p class="list-group-item-text">'+articleData[i].date+'</p></li>';
  }
      x += '</ul>';
      return x;
}


function hash (input, salt) {
    var hashed = crypto.pbkdf2Sync(input, salt, 10000, 512, 'sha512');
    return ["pbkdf2", "10000", salt, hashed.toString('hex')].join('$');
}

function checkAuth(req, res, next) {
  if (!req.session || !req.session.auth || !req.session.auth.username) {
    res.status(401).send('You must be logged in to proceed.');
  } else {
    next();
  }
}
function checkAdmin(req, res, next) {
  if (!req.session || !req.session.auth || !req.session.auth.username || req.session.auth.username!=blogRootUser) {
    res.status(401).send('You must be logged in as admin to proceed.');
  } else {
    next();
  }
}
function emailValidate(email){
  var atpos = email.indexOf("@");
  var dotpos = email.lastIndexOf(".");
  if (atpos<1 || dotpos<atpos+2 || dotpos+2>=email.length) {
      return false;
  }
    return true;
}
/*Functions end here*/

/*Data Requests Start Here*/
app.get('/blogs/:category',function(req,res){
  var category=decodeURI(req.params.category);
  if(category=='latest'){
    query="SELECT title,category,date FROM article WHERE $1=$1 ORDER BY id DESC limit 5";
  }
  else if(category=='all'){
    query="SELECT title,category,date FROM article WHERE $1=$1";
  }
  else{
    query="SELECT title,category,date FROM article WHERE category=$1";
  }
  pool.query(query,[category],function(err,result){
     if(err){
       res.status(500).send('Cannot retrieve list.\n'+err.toString());
     }
     else{
       if(result.rows.length==0){
         res.status(404).send('There is no article to show in this category.');
       }
       else{
         res.send(articleListTemplate(result.rows));
       }
     }

  });
});

app.get('/blogs/:category/:title',function(req,res){
  var query="";
  var category=decodeURIComponent(req.params.category);
  var title=decodeURIComponent(req.params.title);
  var article_unhashed=title+category;
  query="SELECT title,category,date,content FROM article where hash=MD5($1)";
  pool.query(query,[article_unhashed],function(err,result){
    if(err){
      res.status(500).send(msg('Server error'+err.toString()));
    }
    else{
      if(result.rows.length==0){
        res.status(404).send(msg('Article Not Found.'));
      }
      else{
            pool.query("SELECT tag FROM tag where article_hash=MD5($1)",[article_unhashed],function(errt,resultt){
                    if(!errt){
                      res.send(jstring({"article":result.rows[0],"tags":resultt}));
                    }

            });
          }
        }
      });
  });

app.get('/getComments/:article_hash',function(req,res){
  var hash=req.params.article_hash;
  pool.query("SELECT comment,username,date FROM comment where article_hash=MD5($1)",[hash],function(err,result){
    if(err){
      res.status(400).send(msg('Can\'t get comments'+err.toString()));
    }
    else{
      res.send(jstring(result.rows));
    }
  });
});

/*Data Requests End Here*/


/*Post Request Start Here*/
app.post('/post/article',checkAuth,function(req,res){
  var title=req.body.title;
  var category=req.body.category;
  var content=req.body.content;
  console.log(req.body.tags);
  var tags=req.body.tags.split(',');
  
  if(!title.trim() || !category.trim() || !content.trim()){
    res.status(400).send('Please Fill The Fields Properly.')
  }else{
      if(req.session.auth.username!=blogRootUser){
            title=escape(title);
            content=escape(content);
        }
  pool.query('INSERT INTO article(title,category,date,content,hash) values($1,$2,NOW(),$3,MD5($4))',[title,category,content,title+category],function(err,result){
    if(!err){
      for(i=0;i<tags.length;i++){
        pool.query('INSERT INTO tag values($1,MD5($2))',[escape(tags[i].trim()),title+category],function(errtag,resulttag){
          if(errtag){
            res.status(500).send('You might be using duplicate tags'+errtag.toString());
          }
        });
      }
      res.send('Congrats! Blog Submitted Succesfully.');
    }
    else{
      res.status(500).send('You might be using same title for two blogs in same category.'+err.toString())
    }

  });
}
});

app.post('/post/comment/:category/:title',checkAuth,function(req,res){
  var article_hash=decodeURI(req.params.title)+req.params.category;
  var comment=req.body.comment;
  var username='';
  if(!comment.trim()){
    res.status(400).send("We don't insert empty comments.")
  }else{
    var date=Date();
    if(req.session.auth.username==blogRootUser)
      username="Hariom";
      else{
        username=req.session.auth.username;
      }
  pool.query('INSERT INTO comment(comment,article_hash,date,username) values($1,MD5($2),NOW(),$3)',[comment,article_hash,req.session.auth.username],function(err,result){
    if(err){
      res.status(403).send("I can't let you insert this comment"+err.toString());
    }
    else{
      res.send(JSON.stringify({"comment":comment,"date":date,"username":username}));
    }
  });
}
});

app.post('/post/feedback',function(req,res){
  var name=req.body.name;
  var comment=req.body.comment;
  var email=req.body.email;
  if(!comment.trim() || !name.trim() || !email.trim()){
    res.status(400).send("I don't take incomplete feedbacks. Please fill the data properly.")
  }
  else if(!emailValidate(email)){
    res.status(400).send('I won\'t tell you the correct format of email. Try another email.' );
  }
  else if(comment.length>1000){
       res.status(400).send('Give your feedback in less than 1000 chars.' );
  }
  else{
    if(req.session && req.session.auth && req.session.auth.username)
      name=req.session.auth.username+'$user';

  pool.query('INSERT INTO feedback(feedback,email,date,name) values($1,$2,NOW(),$3)',[comment,email,name],function(err,result){
    if(err){
      res.status(403).send("Sorry! I can't let you insert this comment"+err.toString());
    }
    else{
      res.send('Thank You for your feedback.');
    }
  });
}
});

app.post('/register',function(req,res){
  var username=req.body.username;
  var email=req.body.email;
  var password=req.body.password;
  if(!emailValidate(email)){
      res.status(400).send('Should I tell you the format of email?');
  }
  else if(!username.trim() || !password.trim() || username.length>32 || password.length>32){
    res.status(400).send('Cannot leave username or password blank.Please Enter Username/Password:(Upto 32 chars)')
  }
  else if(!/^[a-zA-Z0-9_.@ ]+$/.test(username)){  //If username contains other than a-z,A-Z,0-9 then true.
        res.status(500).send("Username can't contain special characters except _.@");
	}else{

  var salt = crypto.randomBytes(128).toString('hex');
  password = hash(password, salt);
  pool.query('SELECT username from "user" where username=$1',[username],function(err,result){
    if(err){
      res.status(500).send('Something bad happened on our side.'+err.toString());
    }
    else{
       if(result.rows.length===0){
         pool.query('INSERT INTO "user"(username,password,email) values($1,$2,$3)',[username,password,email],function(errc,resultc){
           if(errc){
             res.status(500).send('Something Unexpected happened. Please Try Again Later.'+err.toString());
           }
           else{
             res.send('User successfully registered. You can login now.');
           }
         });
       }
       else{
         res.status(403).send('This Username is not available or Email already registered.');
       }
     }
  });
}
});

app.post('/login',function(req,res){
  var username = req.body.username;
  var password = req.body.password;
  if(!username.trim() || !password.trim() || username.length>32 || password.length>32){
    res.status(400).send('Cannot leave username or password blank. Please Enter Username/Password:(Upto 32 chars)')
  }
  else{
   pool.query('SELECT * FROM "user" WHERE username = $1 or email=$1', [username], function (err, result) {
      if (err) {
          res.status(500).send(err.toString());
      } else {
          if (result.rows.length === 0) {
              res.status(403).send('Username or Password is invalid');
          } else {
              // Match the password
              var dbString = result.rows[0].password;
              var salt = dbString.split('$')[2];
              var hashedPassword = hash(password, salt); // Creating a hash based on the password submitted and the original salt
              if (hashedPassword === dbString) {

                // Set the session
                req.session.auth = {username: result.rows[0].username};
                // set cookie with a session id

                res.send('You have entered the correct credentials.');

              } else {
                res.status(403).send("Don't give me wrong credentials.");
              }
          }
      }
   });
  }
});
app.get('/check-login',checkAuth,function (req, res) {
  var username;
  if(req.session.auth.username==blogRootUser)
    username="admin";
    else{
      username=req.session.auth.username;
    }
              res.send('Logged in as:'+username);
});
app.get('/logout', checkAuth,function (req, res) {
   delete req.session.auth;
   res.send('You logged out successfully. Visit again!');
});
/*Post Request End Here*/


var port = 8080;// Use 8080 for local development because you might already have apache running on 80
app.listen(8080, function () {
  console.log(`IMAD course app listening on port ${port}!`);
});