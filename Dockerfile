FROM node:9.11.2-alpine

RUN mkdir /app

COPY package.json /app
COPY package-lock.json /app
COPY index.js /app

WORKDIR /app
RUN npm install

EXPOSE 5004

CMD node index.js