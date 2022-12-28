const Product = require('../models/product');
const {validationResult} = require('express-validator')
const fileHelper= require('../util/file')

exports.getAddProduct = (req, res, next) => {
  res.render('admin/edit-product', {
    pageTitle: 'Add Product',
    path: '/admin/add-product',
    editing: false,
    hasErrors : false,
    errorMessage : null


  });
};

exports.postAddProduct = (req, res, next) => {
  const title = req.body.title;
  const image = req.file;
  const price = req.body.price;
  const description = req.body.description;
  const errors = validationResult(req);
  
  if(!image){
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Add Product',
      path: '/admin/edit-product',
      editing: false,
      hasErrors : true,
      errorMessage  :'Attached File is not an image',
      product:{title : title,
               price : price , 
              description : description}
});
  }
  
  if(!errors.isEmpty()){
    return res.status(422).render('admin/edit-product', {
          pageTitle: 'Add Product',
          path: '/admin/edit-product',
          editing: false,
          hasErrors : true,
          errorMessage  : errors.array()[0].msg,
          product:{title : title,
                   price : price , 
                  description : description}
    });

  }
  const imageUrl = req.file.path
  console.log(imageUrl)
  const product = new Product({
    title: title,
    price: price,
    description: description,
    imageUrl: imageUrl,
    userId: req.user
  });
  product
    .save()
    .then(result => {
      // console.log(result);
      console.log('Created Product');
      res.redirect('/admin/products');
    })
    .catch(err => {
      // throw new Error('System error')
      // or we can throw an error with more details like the status code
      error = new Error(err);
      error.httpStatusCode = 500 // we can use error.httpStatusCode in the error handler middleware in app.js
      return next(error); // Here , Express js will search for the middleware error handler in app.js
    });
};

exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect('/');
  }
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(product => {
      if (!product) {
        return res.redirect('/');
      }
      res.render('admin/edit-product', {
        pageTitle: 'Edit Product',
        path: '/admin/edit-product',
        editing: editMode,
        product: product,
        hasErrors : false,
        errorMessage : null
      });
    })
    .catch(err => {
      error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postEditProduct = (req, res, next) => {
  const prodId = req.body.productId;
  const updatedTitle = req.body.title;
  const updatedPrice = req.body.price;
  const image = req.file;
  const updatedDesc = req.body.description;

  Product.findById(prodId)
    .then(product => {
      if(product.userId.toString() !== req.user._id.toString()){
        return res.redirect('/')
      }
      product.title = updatedTitle;
      product.price = updatedPrice;
      product.description = updatedDesc;
      if(image){
      fileHelper.fileDelete(product.imageUrl)  
      product.imageUrl = req.file.path;
      }
      return product.save().then(result => {
        console.log('UPDATED PRODUCT!');
        res.redirect('/admin/products');
      })
    })
    
    .catch(err => {
      error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getProducts = (req, res, next) => {  
  Product.find({userId : req.user._id})
    // .select('title price -_id')
    // .populate('userId', 'name')
    .then(products => {
      res.render('admin/products', {
        prods: products,
        pageTitle: 'Admin Products',
        path: '/admin/products',
        isAuthenticated: req.session.isLoggedIn
      });
    })
    .catch(err => {
      error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
      
    });
};

exports.deleteProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
  .then(product => {
    if(!product){
      return next(new Error('prodcut not found'))
    }
    fileHelper.fileDelete(product.imageUrl)
    return Product.findByIdAndRemove(prodId)
  })
  
    .then(() => {
      console.log('DESTROYED PRODUCT');
      res.status(200).json({message : 'Success'})
    })
    .catch(err => {
      res.status(500).json({message :'Deleting product failed'})
    });
};
