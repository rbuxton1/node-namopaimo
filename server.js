const express = require('express')
const app = express()
const mysql = require('mysql')
const cookieParser = require("cookie-parser")
const bodyParser = require("body-parser")
const nodemailer = require("nodemailer")

console.log("Started NodeJS component")

var db = mysql.createPool({
  host: process.env.DB,
  user: "namopaimoUser",
  password: process.env.DB_PASS,
  database: "nmpm"
})

var transporter = nodemailer.createTransport({
  service:"gmail",
  auth:{
    user:"namopaimo.registrar@gmail.com",
    pass: process.env.EMAIL_PASS
  }
})

app.set('view engine', 'ejs')
app.use(cookieParser())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.static("public"))

var idLen = 10
var randomString = function(length, callback){
  var result           = '';
  var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for ( var i = 0; i < length; i++ ) {
     result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  callback(result);
}
var makeid = function(length, callback) {
   randomString(length, function(code){
     db.query("SELECT * FROM registrar WHERE code = ?", [code], function(err, sqlRes){
       if(err) console.error(err)
       if(sqlRes.length == 0) {
         callback(code);
       } else callback(makeid(length));
     })
   })
}

app.get("/", function(req, res){
  res.render("index")
})

app.post("/register", function(req, res){
  sql = "INSERT INTO `registrar`(`id`, `first`, `last`, `email`, `address`, `country`, `level`, `age`, `desc`, `mediums`, `color`, `extra`, `paid`, `code`) VALUES (NULL,?,?,?,?,?,?,?,?,?,?,?,?,?)"
  makeid(idLen, function(code){
    db.query(sql, [req.body.first, req.body.last, req.body.email, req.body.address, req.body.country,
                   req.body.level, req.body.age, req.body.desc, req.body.medium, req.body.color, req.body.data, req.body.fee, code], function(err, sqlRes){
      if(err){
        console.log(err)
        console.log(sqlRes)
      } else {
        var mailOptions = {
          from:"namopaimo.registrar@gmail.com",
          to: req.body.email,
          subject: "NaMoPaiMo Completion Code",
          text: " Your completion code for NaMoPaiMo 2020 is: '" + code + "' Please visit the completion page (namopaimo.com/complete) and use this code to upload a photo of your finished entry. Thanks! -NaMoPaiMo Staff"
        }
        transporter.sendMail(mailOptions, function(mailErr, info){
          if(mailErr){
            console.log(err)
          } else {
            res.cookie("code", code, { expires: new Date(Date.now() + 86400 * 1000 * 365 * 5), httpOnly: true })
            res.redirect("/registered")
          }
        })
      }
    })
  })
})

app.get("/registered", function(req, res){
  res.render("registered", {code: req.cookies.code})
})

app.get("/complete", function(req, res){
  res.render("complete")
})

app.post("/completing", function(req, res){
  db.query("INSERT INTO `completed`(`code`, `images`, `date`) VALUES (?, ?, DATE(NOW()))", [req.body.key, req.body.images], function(err, sqlRes){
    if(err) console.log(err)
    res.redirect("/completed")
  })
})

app.get("/completed", function(req, res){
  var sql = "SELECT registrar.first, registrar.last, completed.images, completed.date FROM registrar JOIN completed ON registrar.code = completed.code ORDER BY completed.date DESC"
  db.query(sql, function(err, data){
    res.render("completed", {data: data})
  })
})

app.listen(3000, function(){ console.log("Listening on port 3000") })
