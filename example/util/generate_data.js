var faker = require('faker');
var dockerGen = require('docker-namesgenerator');
var path = require('path');
var fs = require('fs');

var cards = [], pages = [], groups = [], people = [];

for(var i = 0; i < 10000;) {
	people.push({
		id: ++i,
		displayName: faker.name.findName(),
		avatarKey: faker.image.avatar(),
		email: faker.internet.email(),
		desc: faker.lorem.sentences(1 + Math.floor(Math.random() * 5))
	});
}

fs.writeFileSync(path.join(process.cwd(), 'example/data.json'), JSON.stringify({
	people: people
}, null, 2));