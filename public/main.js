$.material.init();
var app = angular.module('app', []);

app.service('Socket', function ($rootScope) {
	var socket = io.connect();
	this.on = function (channel, cb) {
		socket.on(channel, function (d) {
			$rootScope.$apply(function () {
				cb(d);
			});
		});
	}
	this.emit = socket.emit.bind(io);
})

app.directive('note', function () {
	return {
		restrict: 'E',
		scope: {
			keys: '='
		},
		link: function(scope, element, attrs) {
			scope.$watch(function() { 
				return scope.keys
			}, function (val) {
				VF = Vex.Flow;
				var div = element[0];
				angular.element(div).empty();
				var renderer = new VF.Renderer(div, VF.Renderer.Backends.SVG);

				renderer.resize(70, attrs.size || 200);
				var context = renderer.getContext();
				context.setFont("Arial", 10, "").setBackgroundFillStyle("#eed");

				var stave = new VF.Stave(0, 0, 70);

				stave.addClef("treble");

				if (scope.keys.length != 0) {
					var notes = [
					  new VF.StaveNote({ keys: scope.keys, duration: "4" , auto_stem: true}),
					];
					var voice = new VF.Voice({num_beats: 1,  beat_value: 4});
					voice.addTickables(notes);

					var formatter = new VF.Formatter().joinVoices([voice]).format([voice], 100);
					voice.draw(context, stave);
				}
				stave.setContext(context).draw();
			});
		}
	}
})
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
app.controller('MainCtrl', function (Socket, $http, $timeout, $document) {
	this.vexNotes = [];
	this.current = null;
	this.ignore = true;
	var New = () => {
		$http.get('/new').then(resp => {
			this.text = "Play!";
			this.current = resp.data;
			this.ignore = false;
			this.vexNotes = [this.current.key].map(k => getNote(k).vex);
			console.log(this.vexNotes)
		});
	}
	var onPiano = d => {
		if (this.ignore) return;
		if (d.length == 0) return;
		var score = 0;
		if (d.length > 1 || d[0] != this.current.key) {
			this.text = "WRONG " + CONV[getNote(this.current.key).note];
			score--;
		}else {
			this.text = "CORRECT "+ CONV[getNote(this.current.key).note];
			score++;
		}
		$http.post('/feedback', {key: this.current.key, score: score});
		this.ignore = true;
		$timeout(() => {
			New();
		}, 1000);
	}

	Socket.on('key', onPiano);

	New();


	$document.bind("keypress", (event) => {
		var key = String.fromCharCode(event.keyCode);
		if (key == 'r') {
			onPiano([this.current.key])
		}else {
			onPiano(-1)
		}
	});
})
