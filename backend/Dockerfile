
FROM node:22-alpine

WORKDIR /app

# Update npm to a version containing the patched tar dependency
RUN npm install --global npm@10.9.9

COPY package*.json ./

RUN npm ci --omit=dev

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
