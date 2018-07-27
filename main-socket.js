document.addEventListener("DOMContentLoaded", function() {
    const modal = document.getElementById('myModal');
    const ulTyping = document.querySelector('#typing');

    function hideModal() {
        modal.style.display = "none";
    }

    const socket = io('http://localhost:4200');
    const TYPING_TIMER_LENGTH = 500;
    let userId;
    let typing = false;
    let lastTypingTime;

    socket.on('connect', () => {
        userId = socket.id;
    });
    const USER = {
        id: null,
        name: null,
        nickname: null
    };

    const usersList = document.querySelector('[data-elem=users-list]');
    const mesgsList = document.querySelector('[data-elem=msg-list]');
    const text = document.querySelector('[data-elem=message]');
    text.addEventListener('keyup', ({keyCode}) => {
        if (keyCode === 13) {
            send();
        }
    });
    const btnSaveUser = document.querySelector('[data-elem=save]');
    btnSaveUser.addEventListener('click', save, {once: true, passive: true});

    const inputMessage = document.querySelector('[data-elem=message]');
    inputMessage.addEventListener('keydown', updateTyping);
    function updateTyping() {
        if (!typing) {
            typing = true;
            socket.emit('typing', USER);
        }
        lastTypingTime = (new Date()).getTime();

        setTimeout(() => {
            var typingTimer = (new Date()).getTime();
            var timeDiff = typingTimer - lastTypingTime;
            if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
                socket.emit('stop typing', USER);
                typing = false;
            }
        }, TYPING_TIMER_LENGTH);
    }

    const btnSendUser = document.querySelector('[data-elem=send]');
    btnSendUser.addEventListener('click', send, {passive: true});

    socket.on('get user', (data) => {
        Object.assign(USER, data);
        renderTitle(USER);
    });


    socket.on('get users', (data) => {
        renderUserList(data);
    });

    socket.on('get message', (mesg) => {
       renderMesgsList([mesg], false)
    });

    socket.on('get messages', (mesgs) => {
        renderMesgsList(mesgs)
    });

    socket.on('typing', (user) => {
        addWhoTyping(user);
    });

    socket.on('stop typing', (user) => {
        deleteTyping(user.id);
    });

    function save() {
        const name = document.querySelector('[data-elem=name]').value;
        const nickname = document.querySelector('[data-elem=nickname]').value;
        const user = {name, nickname};
        hideModal();
        socket.emit('create user', userId, user);
    }

    function send() {
        const msg = {
            msg: text.value,
            nickname: USER.nickname
        };
        text.value = '';
        socket.emit('new message', msg);
    }

    function renderUserList(arr) {
        usersList.innerHTML = '';
        usersList.appendChild(getDoneList(arr, getTemplateUser, 'li'))
    }

    function addWhoTyping(user) {
        const template = document.createElement('li');
        template.id = user.id;
        template.innerHTML = getTemplateTyping(user);
        ulTyping.appendChild(template)
    }

    function deleteTyping(id) {
        document.getElementById(id).remove();
    }

    function renderMesgsList(arr, isClear = true) {
        if (isClear) {
            mesgsList.innerHTML = '';
        }
        mesgsList.appendChild(getDoneList(arr, getTemplateMsg, 'li'))
    }


    function renderTitle({name, nickname}) {
        document.querySelector('[data-elem=title-name]').innerHTML = name;
        document.querySelector('[data-elem=title-nickname]').innerHTML = nickname;
    }

    function getDoneList(arr, fnTemplate, createElem = 'div', classElem = 'clearfix') {
        const fragment = document.createDocumentFragment();
        arr.reduce(function(fragment, current) {
            const template = document.createElement(createElem);
            template.classList.add(classElem);
            template.innerHTML = fnTemplate(current);
            fragment.appendChild(template);
            return fragment;
        }, fragment);
        return fragment;
    }

    function getTemplateMsg({nickname, msg}) {
        const reg = '@' + USER.nickname;
        const classForNotified = (msg.search(reg) != -1) ? 'notified' : '';

        return `<div class="message-data">
                    <span class="message-data-name">${nickname}</span>
                </div>
                <div class="message my-message ${classForNotified}">
                    ${msg}
                </div>`;
    }

    function getTemplateUser({name, nickname, status, label}) {
        return `<div class="about">
                    <div class="name">
                        <span class="title">${name}</span>
                        <span class="text">${nickname}</span>
                    </div>
                    <div class="status">
                        <i class="fa fa-circle ${status}"></i> ${label}
                    </div>
                </div>`;
    }

    function getTemplateTyping({name, nickname, status, label}) {
        return `<div class="message-data">
                    <span class="message-data-name"><i class="fa fa-circle online"></i>@${name} is typing</span>
                </div>
                <i class="fa fa-circle online"></i>
                <i class="fa fa-circle online" style="color: #AED2A6"></i>
                <i class="fa fa-circle online" style="color:#DAE9DA"></i>`;
    }

});