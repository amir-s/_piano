var fs = require('fs');

function DB(file) {
	var db = {};
	this.db = db;
	var wj = () => fs.writeFileSync(file, JSON.stringify(this.db, null, 4));
	var rj = () => JSON.parse(fs.readFileSync(file).toString());
	
	if (!fs.existsSync(file)) {
		wj({});
	}else {
		db = rj();
		this.db = db;
	}

	this.init = () => {
		db.notes = [];
		for (var i=28;i<=64;i++) {
			if ([1, 3, 6, 8, 10].indexOf(i%12) != -1) continue;
			db.notes.push({
				key: i,
				t: 0,
				f: 0,
				score: 0,
				active: false
			});
		}
		var m = db.notes[Math.floor(db.notes.length/2)].key;
		db.notes.sort((ka, kb) => {
			var a = ka.key, b = kb.key;
			if (Math.abs(a-m) > Math.abs(b-m)) return   1;
			if (Math.abs(a-m) <	 Math.abs(b-m)) return -1;
			return b-a;
		});
		// for (var i=0;i<4;i++) db.notes[i].active=true;
		wj();
	}
	this.save = wj;
}

module.exports = DB;