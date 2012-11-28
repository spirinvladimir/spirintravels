/**
 * Module dependencies.
 */
var express = require('express'),
	routes = require('./routes'),
	fs = require('fs.extra'),
	path = require('path'),
	util = require('util'),
	assert = require('assert'),
	boli = require('./boli').boli,
	app = express(),
	blog_data = require('./blog.js').blog_data;
	solr = require('solr'),
	solrclient = solr.createClient('http://api.solrhq.com', '80', '', '/txt/061643c0225f5b73eec64227b491f6a2/start-session/blog/');

	// Configuration

app.configure(function () {
	app.set('views', __dirname + '/views');
	app.set('view engine', 'jade');
	app.set('view options', {layout: false});
	app.use(express.bodyParser());
	app.use(express.bodyParser({uploadDir: './uploads'}));
	app.use(express.methodOverride());
	app.use(express.cookieParser());
	app.use(app.router);
	app.use(express.static(__dirname + '/public'));
});

app.configure('development', function () {
	app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function () {
	app.use(express.errorHandler());
});

// Routes


app.get('/', routes.index);

app.get('/bs_blog', function (req, res) {
	//console.log(util.inspect(obj, false, null, true));
	////console.log(util.inspect(blog_data.length, false, null, true));
	//
	for (i = 0; i < blog_data.length; i++) {
		if(! blog_data[i].hasOwnProperty('title')) {
			blog_data[i].title = blog_data[i].h;
		}
		if(! blog_data[i].hasOwnProperty('text')) {
			blog_data[i].text = blog_data[i].t;
		}
		if(! blog_data[i].hasOwnProperty('date')) {
			blog_data[i].date = Date.now;
		}
	}
	
    res.render('bs_blog.jade', {obj: blog_data});
});

app.get('/blog_dia', function (req, res) {
	var i, x = -1;
	for (i = 0; i < blog_data.length; i++) {
		if(blog_data[i].h === req.query.h) {
			x = i;
			i = blog_data.length;
		}
	}
	if (x >= 0) {
		res.render('blog_dia.jade', {date: new Date, title: blog_data[x].h, text: blog_data[x].t, img: blog_data.img, comments: null});
	} else {
		res.render('bs_blog.jade', {obj: blog_data});
	}
});

app.post('/find', function (req, res) {
	console.log('Request:' + req.body.q);
	
	//res.render('bs_blog.jade', {obj: blog_data});//Debug
	
	var query = 'title_t:'+req.body.q;
	solrclient.query(query, function(err, response) {
		if (err) throw err;
		var responseObj = JSON.parse(response);
		console.log('A search for "' + query + '" returned ' + responseObj.response.numFound + ' documents.');
		responseObj.response.docs.forEach(function (doc) {
			if (doc.hasOwnProperty('title_t')) {
				console.log('doc title: ' + doc.title_t);
			}
		});
	});
});

app.get('/excursion', function (req, res) {
    res.render('excursion.jade', {});
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
	res.render('albom-debug.jade', { pageTitle: 'Barcelona' });
});

app.get('/amsterdam', function (req, res) {
	res.render('albom-debug.jade', { pageTitle: 'Amsterdam' });
});

app.get('/praga', function (req, res) {
	res.render('albom-debug.jade', { pageTitle: 'Praga' });
});

app.get('/dresden', function (req, res) {
	res.render('albom-debug.jade', { pageTitle: 'Dresden' });
});

app.get('/warszawa', function (req, res) {
	res.render('albom-debug.jade', { pageTitle: 'Warszawa' });
});

app.get('/plzen', function (req, res) {
	res.render('albom-debug.jade', { pageTitle: 'Plzen' });
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
				},
				b13: {
					x: parseInt(0.75 * req.body.width, 10),
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
			lineHeight: 10,
			image: "/images/mapa2.gif",
			boli: boli.data
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
					re_draw: 0,
					
				},
				b4: {
					x: parseInt(5.4 * (req.body.width / 6), 10),
					y: parseInt(req.body.height / 4, 10),
					color: 'rgba(240,50,70,0.6)',
					move: 0,
					text: "septiembre",
					r: parseInt((0.1) * R, 10),
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

app.listen(3000);