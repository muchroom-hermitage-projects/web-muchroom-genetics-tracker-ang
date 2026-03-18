FROM node:16
RUN npm install -g @angular/cli
WORKDIR /app
ADD . .
# COPY package.json package-lock.json /app/
RUN npm ci
RUN npm run