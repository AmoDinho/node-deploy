const mongoose = require('mongoose');
const Store = mongoose.model('Store');
const User = mongoose.model('User');
const multer = require('multer');
const jimp = require('jimp');
const uuid = require('uuid');

const multerOptions = {
    storage: multer.memoryStorage(),
    fileFilter(req, file, next){
      const isPhoto = file.mimetype.startsWith('image/');
      if(isPhoto){
          next(null,true);
      } else{
          next({message:'That filetype is not allowed!'}, false);
      }
    }
}

exports.homePage = (req, res) =>{
    res.render('index');
};

exports.addStore = (req, res) =>{
    res.render('editStore', {title:'Add Store'});
};

//Image middlerware - Multer
exports.upload = multer(multerOptions).single('photo');

//resize function
exports.resize = async (req, res, next) => {
    //check if there is no new file to resize
    if(!req.file){
        next();//skip to next middleware
        return;
    }
    const extension = req.file.mimetype.split('/')[1];
    req.body.photo = `${uuid.v4()}.${extension}`;

    //Now we resize
    const photo = await jimp.read(req.file.buffer);
    await photo.resize(800, jimp.AUTO);
    await photo.write(`./public/uploads/${req.body.photo}`);
    // Once we have writtern to the file system we keep gooing.
    next();
};

exports.createStore = async (req,res) =>{
    req.body.author = req.user._id;
   const store = await (new Store(req.body)).save();
   req.flash('success', `Successfully created ${store.name}. care to leave a review?`);
   res.redirect(`/store/${store.slug}`);
};

exports.getStores = async (req,res) =>{

    const page = req.params.page || 1;
    const limit = 4;
    const skip = (page * limit) - limit;
    //1. need to query database for list of stores
    const storesPromise =  Store
    .find()
    .skip(skip)
    .limit(limit)
    .sort({created: 'desc'})
 
    const countPromise = Store.count();

    const [stores,count] = await Promise.all([storesPromise, countPromise]);

    const pages = Math.ceil(count / limit);

    if(!stores.length && skip){
        req.flash('info', `Hey! ou asked for page #{page}. But that doesnt exist. so I put you on ${page}`);
        res.redirect(`/stores/page/${pages}`);
        return;
    }
    res.render('stores', {title:'Stores', stores, pages, count, page});
};

const confirmOwner = (store,user) =>{
    if(!store.author.equals(user._id)){
        throw Error('You must own a store to edit it!');
    }
};

exports.editStore = async (req, res) => {
    //1. Find the store given ID
    const store = await Store.findOne({_id: req.params.id});
    //2. Confirm they are owner of store
    confirmOwner(store, req.user);
    //3. Render out the edit form so the user can update store
    res.render('editStore', {title:`Edit ${store.name}`,store});
};

exports.updateStore = async (req, res) =>{
    //set the location data to be a point
    req.body.location.type = 'Point'; 

    //find store
    const store =  await Store.findOneAndUpdate({ _id: req.params.id}, req.body, {
        new: true, //return new store instead of old one
        runValidators:true
    }).exec();
    req.flash('success', `Successfully updated <strong>${store.name}</strong> <a href="/stores/${store.slug}">View Store</a>`);
    //redirect them to store
    res.redirect(`/stores/${store._id}/edit`);
};


exports.getStoreBySlug = async (req, res, next) =>{

     const store = await Store.findOne({ slug: req.params.slug}).populate('author reviews');
     if(!store) return next();
     res.render('store', {store, title: store.name});
};

exports.getStoresByTag = async (req, res) =>{
   const tag = req.params.tag;
   const tagQuery = tag || {$exists:true};

   const tagsPromise =  Store.getTagsList();
   const storesPromie = Store.find({tags:tagQuery});
   const [tags,stores] = await Promise.all([tagsPromise, storesPromie]);
   
    res.render('tag',{tags, title:'Tags', tag,stores});
};

exports.searchStores = async (req,res) =>{
    const stores = await Store.find({
        $text:{
            $search:req.query.q
        }
    },{
        score:{$meta:'textScore'}
    }).sort({
        score:{$meta:'textScore'}
    })
    //limit to certain number of results
    .limit(5); 
    res.json(stores);
}

exports.mapStores = async (req, res) =>{
     const coordinates = [req.query.lng, req.query.lat].map(parseFloat);
     const q = {
        location:{
            $near:{
                $geometry:{
                    type:'Point',
                    coordinates
                },
                $maxDistance: 10000
            }
        }
     };

     const stores = await Store.find(q).select('slug description location name photo').limit(10);
     res.json(stores);
};

exports.mapPage = (req, res) =>{
    res.render('map',{title:'Map'});
}

exports.heartStore = async (req, res) =>{
    const hearts = req.user.hearts.map(obj => obj.toString());
    const operator = hearts.includes(req.params.id) ? '$pull' : '$addToSet';
    const user = await User.findByIdAndUpdate(req.user._id, 
    {[operator]: {hearts:req.params.id}},
    {new:true}
    );
    res.json(user);
}

exports.getHearts = async(req, res) =>{
    const stores = await Store.find({
        _id: {$in: req.user.hearts}
    });
    res.render('stores',{title:'Hearted Stores', stores});
};


exports.getTopStores = async (req, res) =>{
    const stores = await Store.getTopStores();
    
    res.render('topStores', {stores, title:'Top Rated'});
}