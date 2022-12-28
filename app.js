const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const flash = require('connect-flash');
const multer = require('multer');


const errorController = require('./controllers/error');
const User = require('./models/user');
const csrf = require('csurf')


const MONGODB_URI =
  'mongodb+srv://karimzaki:Qp_J4QDmf!xWz2V@cluster0.e8jo4uh.mongodb.net/shop';

const app = express();
const store = new MongoDBStore({
  uri: MONGODB_URI,
  collection: 'sessions'
});

const csrfProtection = csrf();


const storage = multer.diskStorage({
  destination: './images',
  filename: function (req, file, cb) {
       cb(null, file.originalname)
  }
});

const fileFilter = (req,file,cb) => {
  if(file.mimetype == 'image/png' || file.mimetype == 'image/jpg' || file.mimetype == 'image/jpeg'){
    cb(null,true)
  }
  else{
    cb(null,false)
  }
}

app.set('view engine', 'ejs');
app.set('views', 'views');

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');
const { error } = require('console');

app.use(multer({  storage : storage , fileFilter: fileFilter} ).single('image'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images',express.static(path.join(__dirname, 'images')));




app.use(
  session({
    secret: 'my secret',
    resave: false,
    saveUninitialized: false  ,// means that  a session cookie wont be saved on browser unless the session is modified(example : req.session.isloggedin = true)
    store: store
  })
);





app.use(csrfProtection);
app.use(flash());
app.use((req,res,next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn // res.locals data are available in the views
  res.locals.csrfToken = req.csrfToken()
  next();
  
})

app.use((req, res, next) => {
  
  if (!req.session.user) {
    return next();
  }
  User.findById(req.session.user._id)
    .then(user => {
      
      if(!user){
        return next();
      }
      req.user = user;
      next();
    })
    .catch(err => {
      // throw new Error(err)  > this code will note go to the error handling middleware 500 because its executed inside of a promise or a callback
      next(new Error(err)) // but this code will search for the error handling middleware because it detected an error with a next function called 
    });
});


  app.use('/admin', adminRoutes);
  app.use(shopRoutes);
  app.use(authRoutes);
  app.get('/500', errorController.get500);
  app.use(errorController.get404);
  //express is clever enough to detect that this  is a error handling middleware
  app.use((error,req,res,next) => {
    console.log(error);
    
    res.status(500).render('500', {
      pageTitle: 'System Erorr',
      path: '/500',
      isAuthenticated: req.session.isLoggedIn
    });
  })

mongoose
  .connect(MONGODB_URI)
  .then(result => {
    app.listen(3000);
  })
  .catch(err => {
    console.log(err);
  });
