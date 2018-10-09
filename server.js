const fs = require('fs');
const http = require('http');
const server = http.createServer();

const positions = {
    'bottom' : false,
    'top' : false,
    'left' : false,
    'right' : false,
}
const colors = {
    'bottom' : '241,196,15',
    'left' : '52,152,219',
    'top' : '231,76,60',
    'right' : '155,89,182',
};

const io = require('socket.io')(server);

const MAX_PLAYERS = 4;

const BLOCK_SIZE = 15;

const FIELD_WIDTH = 40 * BLOCK_SIZE;
const FIELD_HEIGTH = 40 * BLOCK_SIZE;
const FRAMERATE = 1;

const BAR_SPEED = BLOCK_SIZE / 1;
const BAR_WIDTH = 15 * BLOCK_SIZE;
const BAR_HEIGTH = BLOCK_SIZE;
const BAR_DECALLAGE = BLOCK_SIZE / 2;

let BALL_SPEED_X = .2;
let BALL_SPEED_Y = .2;
const BALL_COLOR = "#FFF";
const BALL_SIZE = BLOCK_SIZE * 2;


let tampon = null;
let newPosition = null;

let players = [];

////////// ----- Objects required to the game ----- //////////
function Field(x=0, y=0){
    this.x = x;
    this.y = y;
}
function Bar(x=0, y=0, speed=1, height, width, id, color, position){
    this.x = x;
    this.y = y;
    this.speed = speed;
    this.h = height;
    this.w = width;
    this.player = id;
    this.color = color;
    this.position = position;

    this.setBar = () => {
        switch (this.position) {
            case 'bottom':
                break;
            case 'left':
                tampon = this.x;
                this.x = (this.y + BAR_DECALLAGE) - (FIELD_WIDTH - BLOCK_SIZE - BAR_DECALLAGE);
                this.y = tampon;

                tampon = this.w;
                this.w = this.h;
                this.h = tampon;
                tampon = null;
                break;
            case 'top':
                this.y = (this.y + BAR_DECALLAGE) - (FIELD_HEIGTH - BLOCK_SIZE - BAR_DECALLAGE);
                break;
            case 'right':
                tampon = this.x;
                this.x = (this.y) - (0);
                this.y = tampon;

                tampon = this.w;
                this.w = this.h;
                this.h = tampon;
                tampon = null;
                break;

        }
    }

    this.moveAction = (x, direction) => {
        if(direction === 'left'){
            if((x - this.speed) >= 0){
                x = x - this.speed;
            }
        } else if (direction === 'right'){
            if(((x + this.speed + this.w) <= field.x) && (x + this.speed + this.h) <= field.y){
                x = x + this.speed;
            }
        }
        return x;
    }

    this.move = (direction) => {
        if(this.position === 'top' || this.position === 'bottom') this.x = this.moveAction(this.x, direction);
        else this.y = this.moveAction(this.y, direction);
    }
}

let barreY = null;

function Ball(x=0, y=0, speedX=1, speedY=1, size=10, color='#000'){
    this.x = x;
    this.y = y;
    this.speedX = speedX;
    this.speedY = speedY;
    this.size = size;
    this.color = color;
    this.collisionX = () => {
        this.speedX *= -1;
        this.x = this.x + this.speedX;
    };
    this.collisionY = () => {
        this.speedY *= -1;
        this.y = this.y + this.speedY;
    };
    this.move = (field, bars) => {
        //console.log(Math.atan2((this.x + this.speedX) - (this.x), (this.y + this.speedY) - this.y));
        // Move X
        // Vérification de colision
        if((this.x + this.size) <= (field.x) && this.x >= 0){
            this.x = this.x + this.speedX;
        } else{
            this.collisionX();
        }
        // Move Y
        if((this.y + this.size) <= (field.y) && this.y >= 0){
            this.y = this.y + this.speedY;
        } else{
            this.collisionY();
        }

        // Collision avec les bars
        for(bar in bars){
            let barre = bars[bar];
            let futureX = this.x + this.speedX;
            let futureY = this.y + this.speedY;

            // Si on est entre les deux extrémités de la barre

            switch (barre.position) {
                case 'top':
                    if(futureX >= barre.x && futureX <= (barre.x + barre.w)){
                        if(futureY >= barre.y && futureY <= (barre.y + barre.h)){
                            this.collisionY();
                        }
                    }
                    break;
                case 'bottom':
                    futureY = futureY + (2*BLOCK_SIZE);
                    if(futureX >= barre.x && futureX <= (barre.x + barre.w)){
                        if(futureY >= barre.y && futureY <= (barre.y + barre.h)){
                            this.collisionY();
                        }
                    }
                    break;
                case 'left':
                    if(futureX >= barre.x && futureX <= (barre.x + barre.w)){
                        if(futureY >= barre.y && futureY <= (barre.y + barre.h)){
                            this.collisionX();
                        }
                    }
                    break;
                case 'right':
                    futureX = futureX + (2*BLOCK_SIZE);
                    if(futureX >= barre.x && futureX <= (barre.x + barre.w)){
                        if(futureY >= barre.y && futureY <= (barre.y + barre.h)){
                            this.collisionX();
                        }
                    }
                    break;
            }
        }

        //for(var x=0; x<bars.length; x++){
        //    if(((this.y + this.size/2) + this.speedY) >= (bars[x].y - bars[x].h)){
        //        if((this.x) > (bars[x].x) && (this.x) < (bars[x].x + bars[x].w)){
        //            this.collisionY();
        //        }
        //    }
        //}
    }
}
////////// ----- End of objects required to the game ----- //////////
if(Math.random() < .5) BALL_SPEED_Y = -BALL_SPEED_Y;
if(Math.random() < .5) BALL_SPEED_X = -BALL_SPEED_X;
let field = new Field(FIELD_WIDTH,FIELD_HEIGTH);
let ball = new Ball((FIELD_WIDTH / 2), (FIELD_HEIGTH / 2), BALL_SPEED_X, BALL_SPEED_Y, BALL_SIZE, BALL_COLOR);
let bars = [];

let interval;

const getPlayerPose = function(players, positions){
    let position = null;
    let color = null;
    for(pose in positions){
        if(positions[pose] === false){
            position = pose;
            positions[pose] = true;
            break;
        }
    }
    color = colors[position];

    let barData = {
        'position' : position,
        'color' : color,
    }

    return barData;
};

io.on('connection', (socket) => {

    let newBar = null;
    let barData = null;
    if(players.length < MAX_PLAYERS){

        let createPlayer = players.length+1;

        players.push({
            id: socket.id,
            number: createPlayer,
        });

        barData = getPlayerPose(players, positions);

        if(createPlayer){
            newBar = new Bar(FIELD_WIDTH/2-BAR_WIDTH/2, ((FIELD_HEIGTH) - (BAR_HEIGTH + BAR_DECALLAGE)), BAR_SPEED, BAR_HEIGTH, BAR_WIDTH, socket.id, 'rgb('+barData.color+')', barData.position);
            newBar.setBar();
            bars.push(newBar);
        }
    } else{
        socket.emit('max');
    }

    let fieldData = null;
    if(newBar !== null && barData !== null){
        fieldData = {
            field:field,
            color:barData.color,
            position:newBar.position,
        }
    } else{
        fieldData = {
            field:field,
            color:colors[0],
            position: positions[0],
        }
    }
    socket.emit('setField', fieldData);
    if(interval) clearInterval(interval);

    socket.on('disconnect', () => {
       for(var x=0; x<players.length; x++){
            if(socket.id === bars[x].player && socket.id === players[x].id){
                positions[bars[x].position] = false;
                bars.splice(x, 1);
                players.splice(x, 1);
            }
       }
    });

    let counter = 0;
    interval = setInterval(() => {
        if(counter == 20){
            counter = 0;
            io.emit('gamerefresh', {
                ball: ball,
                bars: bars,
                players: players,
            });
        }
        counter++;
        if(bars.length > 0){
            ball.move(field, bars);
        }
        /*
            const coords = {x:0,y:0};
            const dimensions = {w:500,h:500};
            const point = {w:5,h5};
            var angle = 70;
            const step = 10;

            setInterval(() => {
                io.emit('coords', coords);
                if(coords.x + point.w > dimensions.w || coords.x < 0)
                    angle = 180 - angle;
                if(coords.y + point.h > dimensions.h || coords.y < 0)
                    angle = 360 - angle;
                let radian = angle * Math.PI / 100;
                let vx = Math.cos(radian);
                let vy = Math.sin(radian);
                coords.x += vx * step;
                coords.y += vy * step;
            });
        */
    }, FRAMERATE);
    socket.on('moveBar', direction => {
        for(var x=0; x<bars.length; x++){
            if(bars[x].player === socket.id){
                bars[x].move(direction);
            }
        }
    });
});

server.on('request', (req, res) => {
    let method = req.method;
    let url = req.url;
    if(url === '/'){
        fs.readFile('index.html', 'utf8', (err, content) => {
            if(err){
                res.writeHead(500);
                res.end();
                return;
            }
            res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
            res.write(content);
            res.end();
        });
        return;
    } else if(url.match('^/socket\.io')){
        return;
    }
    res.writeHead(404);
    res.end();
});

server.listen(3666);