var express = require("express");
var app = express();
const path = require("path");
const bodyParser = require("body-parser");
var http = require('http').createServer(app);

var io = require("socket.io")(http);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html')
});
app.get('/main-socket.js', function (req, res) {
    res.sendFile(__dirname + '/main-socket.js');
});
app.get('/style.css', function (req, res) {
    res.sendFile(__dirname + '/style.css');
});

const users = [];
const messages = [];

const currencies = {
    dollar: 5,
    euro: 7,
    hryvnia: 1
};

const quotes = [
    'Ми прийшли в цей світ, щоб допомагати один одному в нашій подорожі по життю. - Уїльям Джеймс',
    '90% наших турбот стосується того, що ніколи не станеться. - Маргарет Тетчер',
    'Дайте те, що у вас є. Можливо, для когось це буде цінніше, ніж ви можете собі уявити. - Генрі У. Лонгфелло',
    'Хто нічим не ризикує - ризикує всім. - Д. Дейвіс',
    'Життя вимагає руху. - Арістотель'
];

const advices = [
    'Роби таску',
    'А ти зроби таску і краще буде',
    'Доку прочитай',
    'Випий чаю',
    'Занадто мало часу витратив :('
];

const weatherForWeek = {
    crimea: {
        days: ['-1', '-2', '-3', '-4', '-5', '-6', '4']
    },
    kyiv: {
        days: ['-11', '-12', '-13', '-14', '-15', '-16', '11']
    }
};


// factory
class FactoryAnswers {
    constructor(currencies, quotes, advices, weatherForWeek) {
        this.currencies = currencies;
        this.quotes = quotes;
        this.advices = advices;
        this.weatherForWeek = weatherForWeek;
        this.days = [
            'sunday',
            'monday',
            'tuesday',
            'wednesday',
            'thursday',
            'friday',
            'saturday',
            'today',
            'tomorrow'
        ];
        this.notes = [];
    }

    create(typeMethod) {
        return this[typeMethod].bind(this);
    }

    weather(msg) {
        const listWords = msg
            .trim()
            .replace('?', '')
            .split(' ');

        const indexWeather = listWords.indexOf('weather');
        const indexIn = listWords.indexOf('in');

        if (indexIn === -1 || indexWeather === -1) {
            return 'You missed city or in';
        }

        if (indexIn === listWords.length - 1) {
            return 'You missed after in city';
        }

        if (indexIn - indexWeather >= 2) {
            return this.getWeather({
                city: listWords[indexIn + 1],
                day: listWords[indexIn - 1]
            });
        } else {
            return 'You forgot day';
        }
    }

    getWeather({city, day}) {
        if (this.weatherForWeek.hasOwnProperty(city)) {
            let indexDay = this.days.indexOf(day);
            if (indexDay === -1) {
                return `${day} not found`;
            }
            if (indexDay < 7) {
                return `The weather in ${city} ${day}, temperature ${this.weatherForWeek[city].days[indexDay]} C`;
            } else {
                if (indexDay === 7) {
                    const dayToday = new Date().getDay();
                    return `The weather in ${city} ${day}, temperature ${this.weatherForWeek[city].days[dayToday]} C`;
                }

                if (indexDay === 8) {
                    const dayTomorrow = (new Date().getDay() + 1) % 7;
                    return `The weather in ${city} ${day}, temperature ${this.weatherForWeek[city].days[dayTomorrow]} C`;
                }
            }
        } else {
            return `${city} not found`;
        }
    }

    exchange(msg) {
        const listWords = msg.trim().split(' ');
        const indexConvert = listWords.indexOf('convert');
        const indexTo = listWords.indexOf('to');

        if (indexTo === -1) {
            return 'You missed to';
        }

        if (indexTo === listWords.length - 1) {
            return 'You missed after to currency';
        }

        if (indexTo - indexConvert === 3) {
            const amount = listWords[indexConvert + 1];
            const currencyFrom = listWords[indexConvert + 2];
            const currencyTo = listWords[indexTo + 1];
            return this.processConver({amount, currencyFrom, currencyTo});
        } else {
            return 'Please use template Convert amount currency to currency';
        }
    }

    processConver({amount, currencyFrom, currencyTo}) {
        if (this.currencies[currencyFrom] && this.currencies[currencyTo]) {
            const v = (amount * this.currencies[currencyFrom]) / this.currencies[currencyTo];
            return `${amount} ${currencyFrom} = ${v} ${currencyTo}`;
        } else {
            return 'Unfortunately we can not convert your currency now';
        }
    }

    quote(_) {
        return this.quotes[Math.floor(Math.random() * this.quotes.length)];
    }

    advice(_) {
        return this.advices[Math.floor(Math.random() * this.advices.length)];
    }

    note(msg) {
        const listWords = msg
            .trim()
            .replace(/:/g, '')
            .split(' ');

        const indexShow = listWords.indexOf('show');
        const indexList = listWords.indexOf('list');
        const indexSave = listWords.indexOf('save');
        const indexTitle = listWords.indexOf('title');
        const indexDelete = listWords.indexOf('delete');
        const indexBody = listWords.indexOf('body');

        if (indexShow === -1) {
            if (indexDelete === -1) {
                // save
                if (indexSave !== -1 && indexTitle !== -1 && indexBody !== -1) {
                    return this.save({listWords, indexSave, indexBody, indexTitle});
                } else {
                    return 'Please use comands(Save note title, Show note list, Show note <title>, Delete note <title>)';
                }
            } else {
                //delete
                if (listWords.length - indexDelete < 3) {
                    return 'You forgot title delete note';
                } else {
                    const title = listWords
                        .slice(indexDelete + 2, listWords.length)
                        .join(' ');

                    console.log('delete title', title);
                    this.notes = this.notes.filter(note => note.title !== title);
                    console.log('delete notes', this.notes);
                    return 'delete done';
                }
            }
        } else {
            if (indexList === -1) {
                // show one note
                if (listWords.length - indexShow < 3) {
                    return 'You forgot title show note';
                } else {
                    //return show note
                    const title = listWords
                        .slice(indexShow + 2, listWords.length)
                        .join(' ');
                    const [searchedNote] = this.notes.filter(note => note.title === title);
                    if (searchedNote) {
                        return `title: ${searchedNote.title} <br> body: ${searchedNote.body} <br>`
                    } else {
                        return 'This title not found';
                    }
                }
            } else {
                // show list note
                if (this.notes.length) {
                    return this.notes.reduce(
                        (acc, note) => acc + `title: ${note.title} <br> body: ${note.body} <br>`,
                        ''
                    );
                } else {
                    return 'list empty';
                }
            }
        }
    }

    save({listWords, indexSave, indexBody, indexTitle}) {
        if (indexBody - indexTitle < 2) {
            return 'You forgot enter title';
        } else {
            if (listWords.length - indexBody < 2) {
                return 'You forgot enter content body';
            } else {
                //save
                const title = listWords.slice(indexTitle + 1, indexBody).join(' ');
                const body = listWords.slice(indexBody + 1, listWords.length).join(' ');
                this.notes.push({
                    title,
                    body
                });
                console.log('push notes', this.notes);
                return 'save done';
            }
        }
    }
}

const customAnswers = new FactoryAnswers(currencies, quotes, advices, weatherForWeek);

const typesQuestion = {
    Weather: 'weather',
    Exchange: 'convert',
    Notes: 'note',
    Advice: '? #@)₴?$0',
    Quote: 'show quote'
};

//  facade
const Parser = {
    getAnswerWeather: customAnswers.create('weather'),
    getAnswerExchange: customAnswers.create('exchange'),
    getAnswerAdvice: customAnswers.create('advice'),
    getAnswerQuote: customAnswers.create('quote'),
    getAnswerNotes: customAnswers.create('note'),
};

function callTypeAnswer(msg) {
    const userMsg = msg
        .replace(/\n/g, '')
        .toLowerCase();
    for (const typeQuestion in typesQuestion) {
        if (userMsg.includes(typesQuestion[typeQuestion])) {
            return Parser[`getAnswer${typeQuestion}`](userMsg);
        }
    }
    return 'Erorr parse';
}

function isMessageForBot([a, b, o, t]) {
    return a + b + o + t === '@bot';
}


io.on('connection', function (client) {
    console.log('client connected id:', client.id);
    client.on('create user', (id, newUser) => {
        const user = {
            name: newUser.name,
            nickname: newUser.nickname,
            id: id,
            status: 'online',
            label: 'just appeared'
        };
        console.log('user', user);
        users.push(user);
        client.emit('get user', user);
        client.emit('get messages', messages);
        io.emit('get users', users);
        const indexUser = users.length - 1;
        setTimeout(() => {
            if (users[indexUser].status === 'offline') return;
            users[indexUser].label = 'online';
            io.emit('get users', users);
        }, 60 * 1000);
    });
    client.on('new message', (mesg) => {
        // processMessage
        // proxy
        if (isMessageForBot(mesg.msg)) {
            client.emit('get message', mesg);
            const answer = callTypeAnswer(mesg.msg);
            const msg = {
                msg: answer,
                nickname: 'bot'
            };
            client.emit('get message', msg);
        } else {
            if (messages.length >= 100) {
                messages.shift();
            }
            messages.push(mesg);
            io.emit('get message', mesg);
        }
    });

    client.on('typing', (user) => {
        client.broadcast.emit('typing', user);
    });

    client.on('stop typing', (user) => {
        client.broadcast.emit('stop typing', user);
    });
    client.on('disconnect', () => {
        const indexOfUserDisconnected = users.findIndex(u => u.id === client.id);
        const user = users[indexOfUserDisconnected];

        user.status = 'offline';
        user.label = 'just left';

        const msg = {
            msg: `goodbye everybody`,
            nickname: user.nickname
        };
        io.emit('get users', users);
        setTimeout(() => {
            users[indexOfUserDisconnected].label = 'offline';
            io.emit('get users', users);
        }, 60 * 1000);
        io.emit('get message', msg);
        console.log('disconnect', client.id);
    });
});

http.listen(4200, function () {
    console.log('listening: 4200');
});