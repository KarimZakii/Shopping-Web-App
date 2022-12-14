const express = require('express');
const {check,body} = require('express-validator/check')
const User = require('../models/user')

const authController = require('../controllers/auth');

const router = express.Router();

router.get('/login', authController.getLogin);

router.get('/signup', authController.getSignup);

router.post('/login', authController.postLogin);

router.post('/signup', 
[
    check('email')
    .isEmail()
    .withMessage('Please enter a valid email')
    .custom((value , {req}) => {
        return User.findOne({email : value}).then(userDoc => {
            if(userDoc){
                return Promise.reject('Email exists already please pick a diffrent one .')
            }
        })
              
    })
    ,
    body('password','Please enter a password consisting of both letters and numbers , minimum len 5 , max len 20')
        .isLength({min:5 , max:20})
        .isAlphanumeric(),
    body('confirmPassword').custom((value , {req})=> {
        if(value !== req.body.password){
            throw new Error('Passwords have to match')
        }
        else{
            return true
        }
    })
    
]
,authController.postSignup,


);

router.post('/logout', authController.postLogout);

router.get('/reset' ,authController.getReset);

router.post('/reset' ,authController.postReset);

router.get('/reset/:token',authController.getNewPassword);

router.post('/new-password' , authController.postNewPassword);

module.exports = router;