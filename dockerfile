FROM node:18.16-alpine3.18

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

RUN  cd frontend && npm install && npm run build

EXPOSE 5000

CMD [ "node", "backend/server.js" ]