const express = require('express');
const app = express();
const path = require("path");
const BigNumber = require('bignumber.js');

const PORT = 8000;

app.use(express.static('.'));

app.get('/',function(req,res){
    res.sendFile(path.join(__dirname+'/index.html'));
  });
  
  app.get('/dashboard',function(req,res){
    res.sendFile(path.join(__dirname+'/dashboard.html'));
  });
  
  app.get('/sitemap',function(req,res){
    res.sendFile(path.join(__dirname+'/sitemap.html'));
  });
  

app.listen(PORT, function () {
  console.log('listening on port '+PORT);
});