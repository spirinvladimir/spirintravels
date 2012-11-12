/**
 * Module dependencies.
 */
var express = require('express'),
	everyauth = require('everyauth'),
	routes = require('./routes'),
	fs = require('fs.extra'),
	path = require('path'),
	util = require('util'),
	assert = require('assert'),
	app = module.exports = express.createServer(),
	stylus = require('stylus'),
	nib = require('nib'),
	io = require('socket.io').listen(app),
	carrier = require('carrier'),
	mongoose = require('mongoose'),
	//db = mongoose.connect('mongodb://localhost/db'),
	db = mongoose.connect('mongodb://nodejitsu:4eecd4149dccaabfb7ef068439c86e61@staff.mongohq.com:10043/nodejitsudb454086444279'),
	//bd = mongoose.connect('mongodb://spirin:vladimir@alex.mongohq.com:10047/blog_canaria'),
	Schema = mongoose.Schema,
	nicknames = {},
	CommentSchema = new Schema({
		text: String,
		nik: String,
		date: { type: Date, default: Date.now }
	}),
	ImgSchema = new Schema({
		link: String,
		albom: String,
		order: Number,
		description: String,
		comments: [CommentSchema]
	}),
	BlogSchema = new Schema({
		title: String,
		text: String,
		date: { type: Date, default: Date.now },
		images: [String],
		comments: [CommentSchema]
	}),
	Img = mongoose.model('img', ImgSchema),
	Blog = mongoose.model('blog', BlogSchema),
	MongoStore = require('connect-mongo')(express),
	blog_data = require('./blog.js').blog_data,
	boli = require('./boli.js').boli,
	conf = require('./conf.js');


function initdb() {
	var alboms = [
		{name: 'amsterdam', order: 0},
		{name: 'barcelona', order: 0},
		{name: 'dresden', order: 0},
		{name: 'plzen', order: 0},
		{name: 'praga', order: 0},
		{name: 'warszawa', order: 0}
	],
	ind;
	alboms.forEach(function (albom) {
		console.log(util.inspect("Going to read file: " + albom.name + '.txt', false, null, true));
		var inStream = fs.createReadStream(albom.name + '.txt', {flags: 'r'});
		carrier.carry(inStream).on('line', function (line) {
			Img.findOne({'link': line, 'albom': albom.name }, function (err, doc) {
				if (doc === null) {
					var image = new Img();
					image.link = line;
					image.albom = albom.name;
					albom.order += 1;
					image.order = albom.order;
					image.save(function () {
						console.log(util.inspect(image.albom + ' - ' + image.order, false, null, true));
					});
				}
			});
		});
	});
	blog_data.forEach(function (el) {
		Blog.findOne({'title': el.h}, function (err, doc) {
				if (doc === null) {
					var artNew = new Blog();
					artNew.title = el.h;
					artNew.text = el.t;
					artNew.images = el.img;
					artNew.save(function () {
						console.log(util.inspect('Added new day: ' + artNew.title, false, null, true));
					});
				}
		});
	});
}
// Configuration

app.configure(function () {
	app.set('views', __dirname + '/views');
	app.set('view engine', 'jade');
	app.set('view options', {layout: false});
	app.locals.pretty = true
	
	app.use(express.bodyParser());
	app.use(express.bodyParser({uploadDir: './uploads'}));
	
   app.locals.pretty = true
	
	app.use(express.methodOverride());
	app.use(express.cookieParser());
	app.use(express.session({
		secret: 'mju7zaq1nhy6xsw2bgt5cde3vfr4',
		maxAge: new Date(Date.now() + 3600000),
		store: new MongoStore({
			url: 'mongodb://nodejitsu:a887da4690d881acc2555ca4625fd8f6@staff.mongohq.com:10077/nodejitsudb66255327513'
		})
	}));
	
	app.use(everyauth.middleware(app));
	
	app.use(app.router);
	app.use(express.static(__dirname + '/public'));
	initdb();
});


//app.dynamicHelpers({
//    currentUser: function (req, res){
//        return req.user; //it's empty!
//    }
//})

app.configure('development', function () {
	app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function () {
	app.use(express.errorHandler());
});

everyauth.debug = true;

everyauth.vkontakte
	.appId(conf.vkontakte.appId)
	.appSecret(conf.vkontakte.appSecret)
	.findOrCreateUser( function (session, accessToken, accessTokenExtra, vkUserMetadata) {
	
		console.log(util.inspect(accessToken, false, null, true));
		//res.json(JSON.stringify(c));
		//return usersByVkId[vkUserMetadata.uid] ||
		//(usersByVkId[vkUserMetadata.uid] = addUser('vkontakte', vkUserMetadata));
	})
	.redirectPath('/bs_blog');

// Routes

io.sockets.on('connection', function (socket) {
	socket.on('user message', function (msg, order, albom) {
		Img.findOne({'order': parseInt(order, 10), 'albom': albom }, function (err, doc) {
			if (doc !== null) {
				doc.comments.push({
					text: msg,
					nik: socket.nickname
				});
				doc.markModified("comments");
				doc.save(function (err) {
					if (err) {
						console.log(util.inspect("Error in save comment!", false, null, true));
					}
				});
			}
		});
		socket.broadcast.emit('user message', socket.nickname, msg);
	});

	socket.on('nickname', function (nick, fn) {
		if (nicknames[nick]) {
			fn(true);
		} else {
			fn(false);
			nicknames[nick] = socket.nickname = nick;
			socket.broadcast.emit('announcement', nick + ' connected');
			io.sockets.emit('nicknames', nicknames);
		}
	});

	socket.on('nextpage', function (order, albom) {
		Img.findOne({'order': parseInt(order, 10), 'albom': albom }, function (err, doc) {
			if (doc !== null) {
				doc.comments.forEach(function (comment) {
					socket.emit('user message', comment.nik, comment.text);
				});
			}
		});
	});

	socket.on('disconnect', function () {
		if (!socket.nickname) {
			return;
		}
		delete nicknames[socket.nickname];
		socket.broadcast.emit('announcement', socket.nickname + ' disconnected');
		socket.broadcast.emit('nicknames', nicknames);
	});
});

app.get('/index', routes.index);

app.get('/', function (req, res) {
    res.render('excursion.jade', {});
});

app.get('/bs_blog', function (req, res) {
	Blog.find({}, function (err, doc) {
		if (doc !== null) {
			for(i=0;i<doc.length;i++) {
				doc[i].text = doc[i].text.substring(0, 800) + ' ...';
			}
			res.render('H:\\vladimir\\views\\bs_blog.jade', {obj: doc});
			//console.log(util.inspect(doc, false, null, true));
		}
	});
});

app.get('/blog_dia', function (req, res) {
	Blog.findOne({'title': req.query.h}, function (err, doc) {
		if (doc !== null) {
			res.render('blog_dia.jade', {title: doc.title, text: doc.text, img: doc.images, comments: doc.comments});
		}
	});
});

app.post('/comment', function (req, res) {
	Blog.findOne({'title': req.body.title}, function (err, doc) {
		if (doc !== null) {
			doc.comments.push({
					text: req.body.new_message,
					nik: 'user'
			});
			doc.markModified("comments");
			doc.save(function (err) {
				if (err) {
					console.log(util.inspect("Error in save comment!", false, null, true));
				}
				res.redirect('/blog_dia?h=' + doc.title);
				//res.render('blog_dia.jade', {title: doc.title, text: doc.text, img: doc.images, comments: doc.comments});
			});
			//console.log(util.inspect(req.body.new_message + " --- ( " + req.body.title + " )", false, null, true));
		}
	});
});


app.get('/blog', function (req, res) {
    res.render('blog.jade', {});
});

app.get('/blogjunio', function (req, res) {
    res.render('blogjunio.jade', {});
});

app.get('/blogjulio', function (req, res) {
    res.render('blogjulio.jade', {});
});

app.get('/blogagosto', function (req, res) {
    res.render('blogagosto.jade', {});
});

app.get('/blogseptiembre', function (req, res) {
    res.render('blogseptiembre.jade', {});
});

app.get('/blogoctubre', function (req, res) {
    res.render('blogoctubre.jade', {});
});

app.get('/barcelona', function (req, res) {
	res.render('albom.jade', { pageTitle: 'Barcelona' });
});

app.get('/amsterdam', function (req, res) {
	res.render('albom.jade', { pageTitle: 'Amsterdam' });
});

app.get('/praga', function (req, res) {
	res.render('albom.jade', { pageTitle: 'Praga' });
});

app.get('/dresden', function (req, res) {
	res.render('albom.jade', { pageTitle: 'Dresden' });
});

app.get('/warszawa', function (req, res) {
	res.render('albom.jade', { pageTitle: 'Warszawa' });
});

app.get('/plzen', function (req, res) {
	res.render('albom.jade', { pageTitle: 'Plzen' });
});

//app.get('/add/:albom', function (req, res) {
//	res.render('add.jade', { pageTitle: 'Add you slide in albom ' + req.params.albom, albom: req.params.albom });
//});

app.get('/yandex_7f9b63f3eda6a064.html', function (req, res) {
	res.send("<html><head><meta http-equiv=\"Content-Type\" content=\"text/html; charset=UTF-8\"></head><body>Verification: 7f9b63f3eda6a064</body></html>");
});

app.post('/agaete', function (req, res) {
	var excursion = {
		title: "Экскурсия в Агаете и Арукас",
		text: "		Длинная экскурсия на целый день. Экскурсия начинается с поездки в город Арукас, где мы посмотрим крупнейший каталический собор San Juan Bautista, полощади, пройдемся по улочкам, посмотрим дерево Драгон. Далее зайдем в старинный тенистый сад с разнообразными экзотическими деревьями и множеством водоемов. После на машине поднимимся к смотровой площадке на горе Арукас, откуда открывается вид на столицу острова Лас-Пальмас де Гран Канария, на северную береговую линию острова, банановые плантации и бассейны пресной воды. Дальше спускаемся и едем в рыбацкую деревню Агаете на западе острова. Тут мы посмотрим утёс Dedo de Dios(\"Палец Бога\") в скалистых берегах, и соленные отложения в скалах. Далее свободное время: можно погулять по набережной, попробовать месную кухню, покупаться в натуральном басейне сделанном в скалах в котором протекает морская вода. Уезжаем назад в 18:00. Из одежды рекомендуется взять купальный костюм и быть готовым к сильному ветру около скал.",
		time: 6,
		price: [120, 100, 100],// 120 - 3 personas, 100 - 2 personas, 100 - 1 persona
		fotos: ["http://img-fotki.yandex.ru/get/6607/19948730.2/0_714c7_298a297e_M.jpg", "http://img-fotki.yandex.ru/get/6604/19948730.2/0_714c8_d1afee40_M.jpg", "http://img-fotki.yandex.ru/get/6408/19948730.2/0_714c9_1c9177f4_M.jpg", "http://img-fotki.yandex.ru/get/6406/19948730.2/0_714ca_c2bd1388_M.jpg"]
	};
	res.contentType('json');
	res.json(JSON.stringify(excursion));
});

app.post('/bandama', function (req, res) {
	var excursion = {
		title: "Экскурсия на вулкан Бандама и ботанический сад \"Канария\"",
		text: "		Мы подъедем на смотровую площадку 569 метров, на вулкане Бандама. Далее пеший спуск в кратер вулкана на глубину 200 метров. Следующий пункт экскурсии сад \"Канария\" - это крупнейший заповедник на отстрове, где собраны все виды растений и птиц острова. На теретории сада есть выстовочный центр, где собраны предметы из жизни аборигенов \"Гуанчи\", мосты, озера, небольшие водопады, фрагмент Лауревого леса, алея деревьев Драгон. На теретории сада можно купить пальмовый мед, есть ресторан. Рекомендуется закрытая обувь для спуска в кратер.",
		time: 6,
		price: [110, 100, 100],
		fotos: ["http://img-fotki.yandex.ru/get/6505/19948730.2/0_714cb_be092dc0_M.jpg", "http://img-fotki.yandex.ru/get/6608/19948730.2/0_714d4_fab7b59d_M.jpg", "http://img-fotki.yandex.ru/get/6505/19948730.2/0_714d6_327401d3_M.jpg", "http://img-fotki.yandex.ru/get/6504/19948730.2/0_714d7_d2bc7ad_M.jpg"]
	};
	res.contentType('json');
	res.json(JSON.stringify(excursion));
});

app.post('/roquenublo', function (req, res) {
	var excursion = {
		title: "Горы \"Roque Nublo\" и пик острова!",
		text: "		Если Вы хотите поехать в горы, пройтись по хвойным лесам и увидть великолепные виды с высоты птичьего полета и даже выше - то эта экскурсия для Вас! Roque Nublo (Скала-Облоко) - это знаменитый на весь остров пик горы, который образовался естественным путем при извержении вулкана, в древние времена Roque Nublo использовался аборигенами как место поклонения. Рядом с пиком находится гора \"Монах\". Почему она так называется можно понять с первого взгляда - монах застыл в позе молитвы. Вначеле приедем на смотровую площадку откуда видно самую высокую точку острова - Pico de las Nieves (Снежный Пик) высотой в 1949 метров над уровнем моря. Отсюда можно увиидеть даже соседний остров - Тенерифе и запечатлеть его на фотокамеру. Далее мы подъедем к подножию горы Roque Nublo и отсюда начинается пеший маршрут, протяженностью 100 метров вверх. Дорога проходит через хвойный горный лес. Рекомендуется одеть закрытую спортивную обувь и иметь достаточный запас воды.",
		time: 6,
		price: [120, 100, 100],
		fotos: ["http://img-fotki.yandex.ru/get/6407/19948730.2/0_714cc_f75775c9_M.jpg", "http://img-fotki.yandex.ru/get/6406/19948730.2/0_714cd_6522441c_M.jpg", "http://img-fotki.yandex.ru/get/6407/19948730.2/0_714ce_f6e3f7f1_M.jpg", "http://img-fotki.yandex.ru/get/6409/19948730.2/0_714cf_79254cb9_M.jpg"]
	};
	res.contentType('json');
	res.json(JSON.stringify(excursion));
});

app.post('/lpgc', function (req, res) {
	var excursion = {
		title: "Столица - Las Palmas de Gran Canaria",
		text: "		Длинная экскурсия на целый день. Мы приедем в исторический район Vegeta в столице острова Las Palmas de Gran Canaria. Пройдем по узким тенистым улочкам до собора Santa Ana напротив собора главная площадь города, где проходят остновные концерты, и в конце площади дом правительства. Рядом музей Колумба с тремя этажами экспозиций о путеществиях Колумба и карты, рукописи, самая богатая карта Каталунии. Вход в музей Колумба бесплатный. Далее переходим в соседний район Триана. По пройдемся по главной улице Триана которая очень похожа на Арбат в Москве. Посмотрим театр Перез Гальдо и дом музей Перез Гальдо. Дальше едем через площади Ферии и  Испании в район Puerto к огромному 3-x километровому песчанному пляжу Las Canteras с множестовом рифов и богатой мощенной набережной тянущейся вдоль всего пляжа. Вдоль набережной памятники рыбакам, кафэшки, графити, школы сёрфинга, в конце концертный зал. Потом идем парк Santa Catalina - экскурсионный центр города, правее порт в котом можно посмотреть военные-морские силы испании. По желанию можно купаться на пляже Las Canteras.",
		time: 6,
		price: [75, 65, 65],
		fotos: ["http://img-fotki.yandex.ru/get/6606/19948730.2/0_714d8_1e2ebd73_M.jpg", "http://img-fotki.yandex.ru/get/6508/19948730.2/0_714d9_ec54f01_M.jpg", "http://img-fotki.yandex.ru/get/6408/19948730.2/0_714da_8e19c588_M.jpg"]
	};
	res.contentType('json');
	res.json(JSON.stringify(excursion));
});

app.post('/aeropuerto', function (req, res) {
	var excursion = {
		title: "Трансфер в отель",
		text: "		Доставим вас в отель на легковом автомобиле до 3-х человек в машине. При желании поможем с переводом на ресепшене.",
		time: 6,
		price: [0, 0, 35],
		fotos: ["http://img-fotki.yandex.ru/get/6509/19948730.2/0_714c6_c8a96cc0_M.jpg"]
	};
	res.contentType('json');
	res.json(JSON.stringify(excursion));
});

app.post('/list_excursiones', function (req, res) {
		var list_ex = {
			list: [
				{//1
					city: ["Agaete", "Arucas", "Montana Arucas"],
					time: 6,
					link: "/agaete"
				},
				{//2
					city: ["Jardin Canaria", "Volcan Bandama"],
					time: 6,
					link: "/bandama"
				},
				{//3
					city: ["Mogan", "Playa Amadores"],
					price: [100, 80, 80],
					time: 6,
					link: "/mogan"
				},
				{//4
					city: ["Las Palmas de Gran Canaria"],
					time: 6,
					link: "/lpgc"
				},
				{//5
					city: ["Aguimes", "Cueva de Guayadeque"],
					price: [100, 90, 90],
					time: 6,
					link: "/cuevadeg"
				},
				{//6
					city: ["Jardin Canario", "Mercado San Mateo"],
					price: [110, 100, 100],
					time: 6,
					link: "/sanmateo"
				},
				{//7
					city: ["Roque Nublo", "Pico de las Nieves"],
					time: 6,
					link: "/roquenublo"
				},
				{//8
					city: ["Faro Maspalomas"],
					price: [75, 70, 70],
					time: 4,
					link: "/maspalomas"
				},
				{//9
					city: ["Aeropuerto","Maspalomas","Aeropuerto","Mogan","Aeropuerto","Puerto Rico","Aeropuerto","Playa de Ingles","Aeropuerto","Las Palmas de Gran Canaria","Aeropuerto"],
					time: 0.5,
					link: "/aeropuerto"
				}
				//Recuerda la otra excursión: Teror y la Finca de Los Sorios
			]
		};

	res.contentType('json');
	res.json(JSON.stringify(list_ex));
});

app.post('/user_excursion', function (req, res) {
	var dec_w = parseInt(req.body.width, 10),
		dec_h = parseInt(req.body.height, 10),
		R = Math.sqrt(dec_w * dec_w + dec_h * dec_h),
		c = {
			b: {
				b1: {
					x: parseInt(0.43 * req.body.width, 10),
					y: parseInt(0.064 * req.body.height, 10),
					color: 'rgba(255,0,0,0.6)',
					move: 0,
					text: "Las Palmas de Gran Canaria",
					r: parseInt((0.01) * R, 10),
					re_draw: 0
				},
				b2: {
					x: parseInt(0.175 * req.body.width, 10),
					y: parseInt(0.15 * req.body.height, 10),
					color: 'rgba(255,0,0,0.6)',
					move: 0,
					text: "Agaete",
					r: parseInt((0.01) * R, 10),
					re_draw: 0
				},
				b3: {
					x: parseInt(0.458 * req.body.width, 10),
					y: parseInt(0.545 * req.body.height, 10),
					color: 'rgba(255,0,0,0.6)',
					move: 0,
					text: "Aeropuerto",
					r: parseInt((0.01) * R, 10),
					re_draw: 0
				},
				b4: {
					x: parseInt(0.27 * req.body.width, 10),
					y: parseInt(0.945 * req.body.height, 10),
					color: 'rgba(255,0,0,0.6)',
					move: 0,
					text: "Maspalomas",
					r: parseInt((0.01) * R, 10),
					re_draw: 0
				},
				b5: {
					x: parseInt(0.26 * req.body.width, 10),
					y: parseInt(0.52 * req.body.height, 10),
					color: 'rgba(255,0,0,0.6)',
					move: 0,
					text: "Roque Nublo",
					r: parseInt((0.01) * R, 10),
					re_draw: 0
				},
				b6: {
					x: parseInt(0.32 * req.body.width, 10),
					y: parseInt(0.12 * req.body.height, 10),
					color: 'rgba(255,0,0,0.6)',
					move: 0,
					text: "Arucas",
					r: parseInt((0.005) * R, 10),
					re_draw: 0
				},
				b7: {
					x: parseInt(0.3 * req.body.width, 10),
					y: parseInt(0.17 * req.body.height, 10),
					color: 'rgba(255,0,0,0.6)',
					move: 0,
					text: "Teror",
					r: parseInt((0.005) * R, 10),
					re_draw: 0
				},
				b8: {
					x: parseInt(0.29 * req.body.width, 10),
					y: parseInt(0.46 * req.body.height, 10),
					color: 'rgba(255,0,0,0.6)',
					move: 0,
					text: "Pico de las Nieves",
					r: parseInt((0.007) * R, 10),
					re_draw: 0
				},
				b9: {
					x: parseInt(0.15 * req.body.width, 10),
					y: parseInt(0.82 * req.body.height, 10),
					color: 'rgba(255,0,0,0.6)',
					move: 0,
					text: "Mogan",
					r: parseInt((0.01) * R, 10),
					re_draw: 0
				},
				b10: {
					x: parseInt(0.175 * req.body.width, 10),
					y: parseInt(0.88 * req.body.height, 10),
					color: 'rgba(255,0,0,0.6)',
					move: 0,
					text: "Puerto Rico",
					r: parseInt((0.01) * R, 10),
					re_draw: 0
				},
				b11: {
					x: parseInt(0.33 * req.body.width, 10),
					y: parseInt(0.865 * req.body.height, 10),
					color: 'rgba(255,0,0,0.6)',
					move: 0,
					text: "Playa de Ingles",
					r: parseInt((0.01) * R, 10),
					re_draw: 0
				},
				b12: {
					x: parseInt(0.37 * req.body.width, 10),
					y: parseInt(0.15 * req.body.height, 10),
					color: 'rgba(255,0,0,0.6)',
					move: 0,
					text: "Jardin Canaria",
					r: parseInt((0.006) * R, 10),
					re_draw: 0
				}				
			},
			m_down: {
				x: 0,
				y: 0
			},
			maxWidth: 200,
			lineHeight: 10,
			image: "/images/mapa2.gif",
			boli: boli
		};

	res.contentType('json');
	res.json(JSON.stringify(c));
});

app.post('/next', function (req, res) {
	if ((req.body.b.l.move === '1') && (req.body.b.r.move === '0')) {
		Img.findOne({'order': parseInt(req.body.order, 10) - 1, 'albom': req.body.albom }, function (err, doc) {
			if (doc !== null) {
				req.body.order = doc.order;
				req.body.image = doc.link;
			}
			res.contentType('json');
			res.json(JSON.stringify(req.body));
		});
	} else {
		if ((req.body.b.l.move === '0') && (req.body.b.r.move === '1')) {
			Img.findOne({'order': parseInt(req.body.order, 10) + 1, 'albom': req.body.albom }, function (err, doc) {
				if (doc !== null) {
					req.body.order = doc.order;
					req.body.image = doc.link;
				}
				res.contentType('json');
				res.json(JSON.stringify(req.body));
			});
		} else {
			res.contentType('json');
			res.json(JSON.stringify(req.body));
		}
	}
});

app.post('/jumpto', function (req, res) {
	Img.findOne({'order': parseInt(req.body.order, 10), 'albom': req.body.albom }, function (err, doc) {
		if (doc !== null) {
			req.body.order = doc.order;
			req.body.image = doc.link;
		}
		res.contentType('json');
		res.json(JSON.stringify(req.body));
	});
});

app.post('/user_index', function (req, res) {
	var dec_w = parseInt(req.body.width, 10),
		dec_h = parseInt(req.body.height, 10),
		R = Math.sqrt(dec_w * dec_w + dec_h * dec_h),
		c = {
			b: {
				b1: {
					x: parseInt(4 * (req.body.width / 6), 10),
					y: parseInt(req.body.height / 4, 10),
					vx: 1,
					color: 'rgba(111,0,50,0.6)',
					move: 0,
					text: "Barcelona",
					r: parseInt((1 / 14) * R, 10),
					re_draw: 0
				},
				b2: {
					x: parseInt(5 * (req.body.width / 6), 10),
					y: parseInt(req.body.height / 2.2, 10),
					color: 'rgba(11,255,150,0.6)',
					move: 0,
					text: "Amsterdam",
					r: parseInt((1 / 15) * R, 10),
					re_draw: 0
				},
				b3: {
					x: parseInt(4.5 * (req.body.width / 6), 10),
					y: parseInt(req.body.height / 1.5, 10),
					color: 'rgba(240,100,25,0.6)',
					move: 0,
					text: "Praga",
					r: parseInt((1 / 18) * R, 10),
					re_draw: 0
				},
				b4: {
					x: parseInt(5 * (req.body.width / 6), 10),
					y: parseInt(req.body.height / 1.2, 10),
					color: 'rgba(255,0,100,0.6)',
					move: 0,
					text: "Warszawa",
					r: parseInt((1 / 30) * R, 10),
					re_draw: 0
				},
				b5: {
					x: parseInt(4 * (req.body.width / 6), 10),
					y: parseInt(req.body.height / 1.15, 10),
					color: 'rgba(210,40,170,0.6)',
					move: 0,
					text: "Dresden",
					r: parseInt((1 / 25) * R, 10),
					re_draw: 0
				},
				b6: {
					x: parseInt(3.6 * (req.body.width / 6), 10),
					y: parseInt(req.body.height / 1.5, 10),
					color: 'rgba(0,255,0,0.6)',
					move: 0,
					text: "Plzen",
					r: parseInt((1 / 20) * R, 10),
					re_draw: 0
				},
				b7: {
					x: parseInt(1.6 * (req.body.width / 6), 10),
					y: parseInt(req.body.height / 2, 10),
					color: 'rgba(255,0,0,0.6)',
					move: 0,
					text: "blog",
					r: parseInt((1 / 17) * R, 10),
					re_draw: 0
				}
			},
			m_down: {
				x: 0,
				y: 0
			},
			maxWidth: 200,
			lineHeight: 15,
			image: "http://img-fotki.yandex.ru/get/6108/19948730.1/0_69f2d_1efc188_orig.jpg"
		};

	res.contentType('json');
	res.json(JSON.stringify(c));
});

app.post('/user_blog', function (req, res) {
	var dec_w = parseInt(req.body.width, 10),
		dec_h = parseInt(req.body.height, 10),
		R = Math.sqrt(dec_w * dec_w + dec_h * dec_h),
		c = {
			b: {
				b1: {
					x: parseInt(4.3 * (req.body.width / 6), 10),
					y: parseInt(req.body.height / 1.2, 10),
					color: 'rgba(255,30,70,0.6)',
					move: 0,
					text: "junio",
					r: parseInt((0.1) * R, 10),
					re_draw: 0
				},
				b2: {
					x: parseInt(4.5 * (req.body.width / 6), 10),
					y: parseInt(req.body.height / 2.3, 10),
					color: 'rgba(235,235,21,0.6)',
					move: 0,
					text: "julio",
					r: parseInt((0.14) * R, 10),
					re_draw: 0
				},
				b3: {
					x: parseInt(6 * (req.body.width / 6), 10),
					y: parseInt(req.body.height / 1.5, 10),
					color: 'rgba(251,25,140,0.6)',
					move: 0,
					text: "agosto",
					r: parseInt((0.18) * R, 10),
					re_draw: 0
				},
				b4: {
					x: parseInt(5.4 * (req.body.width / 6), 10),
					y: parseInt(req.body.height / 2, 10),
					color: 'rgba(251,25,140,0.6)',
					move: 0,
					text: "septiembre",
					r: parseInt((0.11) * R, 10),
					re_draw: 0
				},
				b5: {
					x: parseInt(3.4 * (req.body.width / 6), 10),
					y: parseInt(req.body.height / 4, 10),
					color: 'rgba(240,70,50,0.6)',
					move: 0,
					text: "octubre",
					r: parseInt((0.1) * R, 10),
					re_draw: 0
				}
			},
			m_down: {
				x: 0,
				y: 0
			},
			maxWidth: 200,
			lineHeight: 15,
			image: "/images/DSC_0616.JPG"
		};

	res.contentType('json');
	res.json(JSON.stringify(c));
});

app.post('/user', function (req, res) {
	var dec_w = parseInt(req.body.width, 10),
		dec_h = parseInt(req.body.height, 10),
		R = Math.sqrt(dec_w * dec_w + dec_h * dec_h),
		albom = req.body.albom.toLowerCase(),
		c = {
			albom: albom,
			b: {
				l: {
					x: 2 * (1 / 30) * R,
					y: dec_h / 2,
					color: 'rgba(111,0,50,0.6)',
					move: 0,
					r: (1 / 30) * R,
					re_draw: 0
				},
				r: {
					x: dec_w - 2 * (1 / 30) * R,
					y: dec_h / 2,
					color: 'rgba(11,255,50,0.6)',
					move: 0,
					r: (1 / 30) * R,
					re_draw: 0
				},
				add: {
					x: 0.85 * dec_w,
					y: 0.1 * dec_h,
					color: 'rgba(255,255,0,0.6)',
					move: 0,
					r: (1 / 40) * R,
					re_draw: 0
				},
				del: {
					x: 0.8 * dec_w,
					y: 0.1 * dec_h,
					color: 'rgba(255,0,0,0.6)',
					move: 0,
					r: (1 / 40) * R,
					re_draw: 0
				},
				text: {
					x: 0.95 * dec_w,
					y: 0.08 * dec_h,
					color: 'rgba(14,14,14,0.6)',
					r: (1 / 25) * R,
					re_draw: 0
				},
				notepad: {
					x: 0.9 * dec_w,
					y: 0.1 * dec_h,
					color: 'rgba(14,14,14,0.6)',
					move: 0,
					r: (1 / 40) * R,
					re_draw: 0
				},
				count: {
					x: 0.05 * dec_w,
					y: 0.05 * dec_h,
					color: 'rgba(255,155,0,0.6)',
					move: 0,
					r: (1 / 60) * R,
					re_draw: 0
				}
			},
			m_down: {
				x: 0,
				y: 0
			},
			text: {
				text: "Es hora a comer verduras fritas. Feliz ocho de marzo",
				maxWidth: 200,//==note.w
				lineHeight: 20,
				color: "white"
			},
			image: '',
			order: 1,
			count: 0
		};
	Img.count({'albom': albom}, function (err, count) {
		if (count > 0) {
			c.count = count;
			Img.findOne({'order': c.order, 'albom': albom }, function (err, doc) {
				c.image = doc.link;
				res.contentType('json');
				res.json(JSON.stringify(c));
			});
		} else {
			res.contentType('json');
			res.json(JSON.stringify(c));
		}
	});
});

app.listen(8080);