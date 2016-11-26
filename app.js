const app = require('koa')();
const serve = require('koa-static');
const router = require('koa-router')();
const views = require('co-views');
const path = require('path');
const parse = require('koa-body');
const Promise = require('bluebird');
const server = require('http').Server(app.callback());
const io = require('socket.io')(server);
const midi = require('midi');
const Stg = require('./db');

var stg = new Stg('./a.json');

if (!stg.db.init2) {
	stg.db.init = true;
	stg.db.last = new Date().getTime();
	stg.init();
}

var l = function () {
	[].slice.call(arguments).forEach(i => console.log(JSON.stringify(i, null, 4)));
	return this;
}

const render = views(__dirname + '/views', {
  map: { html: 'ejs' }
});

router.get('/', function *(next) {
	this.body = yield render('index');
});

var LABELS = ['C',  'C#',  'D',  'D#',  'E',  'F',  'F#',  'G',   'G#',   'A',  'A#',  'B'];
var _CONV  = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];
var CONV = {};
_CONV.forEach((v, i) => CONV[LABELS[i]] = _CONV[i]);
var getNote = function (key) {
	return {
		key: key,
		note: LABELS[key%12],
		oct: Math.ceil((key+1)/12),
		vex: LABELS[key%12] + '/' + Math.ceil((key+1)/12)
	}
}


router.get('/new', function*(next) {
	var out = stg.db.notes.filter(i => i.active);
	console.log('pre', out.map(i => getNote(i.key).vex));
	var bests = out.filter(i => i.score > 5).length;
	while (bests > 0 || out.length < 4) {
		console.log('length', out.length);
		
		var newNote = stg.db.notes.filter(i => !i.active)[0];
		if (!newNote) {
			out = stg.db.notes.slice(0);
			bests = 0;
		}else {
			console.log('New Note', [newNote].map(i => getNote(i.key).vex));
			newNote.active = true;
			out.push(newNote);
			bests--;
		}
	}
	console.log('Done', out.map(i => getNote(i.key).vex));
	console.log();
	stg.save();
	var picked = out[0];
	var x = 1000;
	var min = Math.min(...out.map(i => i.score))
	out.forEach(i => {
		var rnd = Math.random()*(i.score+min);
		if (x > rnd) {
			x = rnd;
			picked = i;
		}
	})
	this.body = picked;
})
router.post('/feedback', parse(), function*(next) {
	stg.db.notes.filter(k => k.key == this.request.body.key)[0].score += ~~this.request.body.score;
	stg.save();
	this.body = {ok: true};
})
var input = new midi.input();
if (input.getPortCount() > 0) input.openPort(0);
var keys = {};
input.on('message', function(deltaTime, message) {
	l(message);
	if (message[0] != 144 && message[0] != 128) return;
	var key = message[1]-21-3;
	keys[key] = true;
	if (message[0] == 128) delete keys[key];
	console.log('sending', key);
	io.emit('key', Object.keys(keys).map(i => ~~i));
});

app
	.use(router.routes())
	.use(router.allowedMethods())
	.use(serve(path.join(__dirname, 'public')));


server.listen(process.env.PORT || 3000, () => console.log("Server started on", process.env.PORT || 3000));
