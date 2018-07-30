FROM node:8.11

COPY index.html ./
COPY index.js ./
COPY main-socket.js ./
COPY style.css ./
COPY package*.json ./
RUN npm install

CMD ["node", "index.js"]