const Product = require('../models/product');
const Order = require('../models/order');

const fs = require('fs')
const path = require('path')
const PDFDocument = require('pdfkit');
const session = require('express-session');
const product = require('../models/product');
const stripe = require('stripe')('sk_test_51M5teGK5l5jUyZ2U9ICSAxObwBg3GOfDqNnnuGOfC2O2mRZAmOCwNsDJZAaOVtlrIY3Vo3RjR8O1DZyH8Q34nDaO003F4OJ5NP')
const ITEMS_PER_PAGE = 1;


exports.getProducts = (req, res, next) => {
  const page = +req.query.page || 1
  let totalItems;
  
  Product.find().countDocuments()
  .then(numProducts => {
     totalItems = numProducts
  return  Product.find()
            .skip((page-1)*ITEMS_PER_PAGE)
            .limit(ITEMS_PER_PAGE)
  })

    .then(products => {
      res.render('shop/index', {
        prods: products,
        pageTitle: 'All Products',
        path: '/products',
        totalProducts : totalItems,
        currentPage : page,
        hasNextPage : (ITEMS_PER_PAGE * page) < totalItems,
        hasPreviousPage : page > 1,
        nextPage : page + 1 ,
        previousPage : page -1,
        lastPage : Math.ceil(totalItems / ITEMS_PER_PAGE)
      });
    })
    .catch(err => {
      error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(product => {
      res.render('shop/product-detail', {
        product: product,
        pageTitle: product.title,
        path: '/products'
      });
    })
    .catch(err => {
      error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getIndex = (req, res, next) => {
  const page = +req.query.page || 1
  let totalItems;
  
  Product.find().countDocuments()
  .then(numProducts => {
     totalItems = numProducts
  return  Product.find()
            .skip((page-1)*ITEMS_PER_PAGE)
            .limit(ITEMS_PER_PAGE)
  })

    .then(products => {
      res.render('shop/index', {
        prods: products,
        pageTitle: 'Shop',
        path: '/',
        totalProducts : totalItems,
        currentPage : page,
        hasNextPage : (ITEMS_PER_PAGE * page) < totalItems,
        hasPreviousPage : page > 1,
        nextPage : page + 1 ,
        previousPage : page -1,
        lastPage : Math.ceil(totalItems / ITEMS_PER_PAGE)
      });
    })
    .catch(err => {
      error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCart = (req, res, next) => {
  req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
      const products = user.cart.items;
      res.render('shop/cart', {
        path: '/cart',
        pageTitle: 'Your Cart',
        products: products
      });
    })
    .catch(err => {
      error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postCart = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId)
    .then(product => {
      return req.user.addToCart(product);
    })
    .then(result => {
      console.log(result);
      res.redirect('/cart');
    });
};

exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  req.user
    .removeFromCart(prodId)
    .then(result => {
      res.redirect('/cart');
    })
    .catch(err => console.log(err));
};
exports.getCheckout = (req,res,next) => {
  let total = 0
  let products
  req.user
  .populate('cart.items.productId')
  .execPopulate()
  .then(user => {
    products = user.cart.items
    products.forEach(p=>{
      total += p.quantity * p.productId.price
    })
    
    return stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items : products.map(p => {
        return {
          quantity : p.quantity,
          
          
          price_data : {
            currency : 'usd',
            unit_amount : p.productId.price * 100 ,
            product_data : {
              name: p.productId.title ,
              description : p.productId.description
            }
          }
          
           
          

        }
      }),
      
      mode: 'payment',
      success_url : req.protocol + '://' + req.get('host') + '/checkout/success', // will look like this http://localhost:3000/checkout/success ,
      cancel_url : req.protocol + '://' + req.get('host') + '/checkout/cancel' 
    })

   
  })
  .then(session => {
    res.render('shop/checkout', {
      path: '/checkout',
      pageTitle: 'Checkout',
      products: products,
      totalSum : total,
      sessionId : session.id
    });
  })
  .catch(err => {
    error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  });
}

exports.getCheckoutSuccess = (req, res, next) => {
  req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
      const products = user.cart.items.map(i => {
        return { quantity: i.quantity, product: { ...i.productId._doc } };
      });
      const order = new Order({
        user: {
          email : req.user.email,
          userId: req.user
        },
        products: products
      });
      return order.save();
    })
    .then(result => {
      return req.user.clearCart();
    })
    .then(() => {
      res.redirect('/orders');
    })
    .catch(err => {
      error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getOrders = (req, res, next) => {
  Order.find({ 'user.userId': req.user._id })
    .then(orders => {
      res.render('shop/orders', {
        path: '/orders',
        pageTitle: 'Your Orders',
        orders: orders
        
      });
    })
    .catch(err => {
      error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};
exports.getInvoice = (req,res,next) => {
 const orderId = req.params.orderId;
 const invoiceName = 'invoice-'+ orderId + '.pdf';
 const invoicePath = path.join('data','invoices',invoiceName)
 Order.findById(orderId).then(order => {
  if(!order){
    return next(new Error('No order found'))
  }
  if(order.user.userId.toString() != req.user._id.toString() ){
    return next(new Error('UnAuthorized'))
  }
  const pdfDoc = new  PDFDocument()
  let totalPrice = 0;
  for(let i = 0 ; i< order.products.length ; i++){
    totalPrice = totalPrice + order.products[i].product.price * order.products[i].quantity
  }
  
  res.setHeader('Content-Type','application/pdf');
  res.setHeader('Content-Disposition','attatchment; filename="'+ invoiceName + '"');
  pdfDoc.pipe(fs.createWriteStream(invoicePath))
  pdfDoc.pipe(res)
  
  pdfDoc.text('Hello your bell is : ' + totalPrice)
  pdfDoc.end();

  
  // this code is not good for big files cause it it takes time waiting for the file to be completely sent , instead we use streamable data to send data as chunks of buffer to the browser
  // fs.readFile(invoicePath , (err,data) =>{
  //   if(err){
      
  //     return next(err)
  //   }
  //   res.setHeader('Content-Type','application/pdf');
  //   res.setHeader('Content-Disposition','attatchment; filename="'+ invoiceName + '"');
  //   res.send(data);
  // })
 }).catch(err => {
 
  return next(err)
 })

 

 }

