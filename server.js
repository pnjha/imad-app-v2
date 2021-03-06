var express = require('express');
var morgan = require('morgan');
var path = require('path');

var app = express();
app.use(morgan('combined'));

app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, 'ui', 'index.html'));
});

app.get('/article-one', function(req,res){
   res.sendFile(path.join(__dirname, 'ui', 'article-one.html'));
});

app.get('/article-two',function(req,res){
    res.sendFile(path.join(__dirname,'ui','article-two.html'));
});


app.get('/DonateBlood',function(req,res){
    res.sendFile(path.join(__dirname,'ui','LaunchPage.html'));
});

app.get('/AboutUs',function(req,res){
    res.sendFile(path.join(__dirname,'ui','AboutUs.html'));
});

app.get('/BloodBanks',function(req,res){
    res.sendFile(path.join(__dirname,'ui','BloodBanks.html'));
});

app.get('/BloodDonationTips',function(req,res){
    res.sendFile(path.join(__dirname,'ui','BloodDonationTips.html'));
});

app.get('/Register',function(req,res){
    res.sendFile(path.join(__dirname,'ui','RegisterAsDonor.html'));
});

app.get('/article-three',function(req,res){
    res.sendFile(path.join(__dirname,'ui','artcle-three.html'));
});

app.get('/Prakash',function(req,res){
    res.sendFile(path.join(__dirname,'ui','portfolio.html'));
});

app.get('/ui/style.css', function (req, res) {
  res.sendFile(path.join(__dirname, 'ui', 'style.css'));
});

app.get('/ui/madi.png', function (req, res) {
  res.sendFile(path.join(__dirname, 'ui', 'madi.png'));
});
app.get('/ui/logo.png', function (req, res) {
  res.sendFile(path.join(__dirname, 'ui', 'logo.png'));
});


var port = 8080; // Use 8080 for local development because you might already have apache running on 80
app.listen(8080, function () {
  console.log(`IMAD course app listening on port ${port}!`);
});