const crypto = require('crypto');
const User = require('../models/user');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const {validationResult} = require('express-validator/check')
var sendGridTransport = require('nodemailer-sendgrid-transport');
var transporter = nodemailer.createTransport(sendGridTransport({
  auth:{
    api_key: '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'
  } 
}))


exports.getLogin = (req, res, next) => {
  res.render('auth/login', {
    path: '/login',
    pageTitle: 'Login',
    errorMessage : req.flash('error'),
    email : ''
    

  });
};

exports.getSignup = (req, res, next) => {
  res.render('auth/signup', {
    path: '/signup',
    pageTitle: 'Signup',
    errorMessage : req.flash('error'),
    oldInput : {
      email : '',
      password : '',
      confirmPassword :''
    }
  });
};

exports.postLogin = (req, res, next) => {
  const email = req.body.email
  const password = req.body.password
  User.findOne({email : email})
    .then(user => {
      if(!user){
        req.flash('error' , 'Invalid Email or Password .')
        return res.render('auth/login', {
          errorMessage : req.flash('error'),
          path: '/login',
          pageTitle: 'Login',
          email: email
        })
        
      }
      bcrypt.compare(password ,user.password)
      .then(doMatch => {
        if(doMatch){
          req.session.isLoggedIn = true;
          req.session.user = user;
          return req.session.save(err => {
            console.log(err);
            res.redirect('/');
          });
        }
        req.flash('error' , 'Invalid Email or Password .')
        res.redirect('/login')
        

      })
      .catch(err => {
        console.log(err)
        res.redirect('/login')
        
      })
      
    })
    .catch(err => {
      error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postSignup = (req, res, next) => {
  const email = req.body.email
  const password = req.body.password
  const confirmPassword = req.body.confirmPassword
  const errors = validationResult(req); 
  if(!errors.isEmpty()){
    console.log(errors.array())
    return res.status(422).render('auth/signup', {
      path: '/signup',
      pageTitle: 'Signup',
      errorMessage : errors.array()[0].msg,
      oldInput : {
        email : email,
        password : password,
        confirmPassword : req.body.confirmPassword
      }
    });
  }
   bcrypt
    .hash(password , 12)
    .then(hashedPw => {
      const user = new User({
        email : email ,
        password: hashedPw ,
        cart : {items : []}
      })
      return user.save()
      .then(result => {
        res.redirect('/login')
        return transporter.sendMail({
          from : 'karimzaki686@gmail.com',  
          to : email,
          subject:'SignUp Succeeded',
          html: '<h1>You successfully signed up </h1>'
        })
        .catch(err => {
          error = new Error(err);
          error.httpStatusCode = 500;
          return next(error);
        });
        })
         
  })  
  
  .catch(err => console.log(err))
};

exports.postLogout = (req, res, next) => {
  req.session.destroy(err => {
    console.log(err);
    res.redirect('/');
  });
};

exports.getReset = (req,res,next) =>{
  res.render('auth/reset', {
    path: '/reset',
    pageTitle: 'Login',
    errorMessage : req.flash('error')
  });
}

exports.postReset = (req,res,next) => {
  crypto.randomBytes(32 , (err,buffer) => {
    if(err){
      console.log(err);
      return res.redirect('/reset')
    }
    const token = buffer.toString('hex');
    User.findOne({email : req.body.email})
    .then(user => {
      if(!user){
        req.flash('error', 'Wrong Email')
        res.redirect('/reset')
      }
      user.resetToken = token;
      user.resetTokenExpiration = Date.now() + 3600000;
      return user.save();
    })
    .then(result => {
      res.redirect('/')
      transporter.sendMail({
        from : 'karimzaki686@gmail.com',
        to : req.body.email,
        subject:'Password Reset',
        html: `
        <p> You Requested a password reset  </p>
        <p> click this <a href="http://localhost:3000/reset/${token}"> link </a> to change the password  </p>
        `
      })
    })
    .catch(err => {console.log(err)})
  })  
}

exports.getNewPassword = (req,res,next) =>{
    const token  = req.params.token;
    User.findOne({ resetToken: token , resetTokenExpiration: { $gt: Date.now() } })
    .then(user => {
      res.render('auth/new-password', {
        path: '/new-password',
        pageTitle: 'New Password',
        errorMessage: req.flash('error'),
        userId: user._id,
        token : token
      });
    })
    .catch(err => {
      error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
    
}

exports.postNewPassword = (req,res,next) => {
  const newPassword = req.body.password
  const passwordToken = req.body.PasswordToken
  const userId = req.body.userId
  let resetUser;

  
  User.findOne({
    resetToken : passwordToken,
    resetTokenExpiration : {$gt : Date.now()},
    _id : userId
  })
  .then(user=> {
    resetUser = user;
    return bcrypt.hash(newPassword,12)
  })
  .then(hashedPassword =>{
    resetUser.password = hashedPassword;
    resetUser.resetToken = undefined;
    resetUser.resetTokenExpiration = undefined;
    resetUser.save();
  })
  .then(result => {
    res.redirect('/login')
  })
  .catch(err => {console.log(err)})

}
