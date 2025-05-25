class game_scene extends Phaser.Scene {
    constructor() {
        super("game_scene");
    }

    init() {
        // variables and settings
        this.ACCELERATION = 250;
        this.DRAG = 500;    // DRAG < ACCELERATION = icy slide
        this.physics.world.gravity.y = 1500;
        this.JUMP_VELOCITY = -500;
        this.PARTICLE_VELOCITY = 50;
        this.SCALE = 2.0;

        this.wasOnGround = false;
        this.jumpCount = 0;
        this.maxJumps = 2;

        this.score = 0;
        this.levelCompleted = false;
    }

    create() {
        this.map_setting();

        this.background_music();

        //Create coins from Objects layer in tilemap
        this.coins = this.map.createFromObjects("Objects", {
            name: "coin",
            key: "tilemap_sheet",
            frame: 151
        });

        this.coins.forEach(coin => {
            coin.anims.play('coinSpin');
        });

        this.physics.world.enable(this.coins, Phaser.Physics.Arcade.STATIC_BODY);

        this.coinGroup = this.add.group(this.coins);

        /* Find water tiles
        this.waterTiles = this.groundLayer.filterTiles(tile => {
            return tile.properties.water == true;
        });

        // TODO: put water bubble particle effect here
        this.waterEmitter = this.add.particles(0,0,'kenny-particles', {
            frame: 'smoke_03.png',
            lifespan: { min: 1000, max: 2000 },
            speedY: { min: -30, max: -60 },
            scale: { start: 0.2, end: 0 },
            alpha: { start: 0.8, end: 0 },
            frequency: 600
        });

        this.waterTiles.forEach(tile => {
            this.waterEmitter.emitParticleAt(tile.getCenterX(), tile.getCenterY());
        }); */


        // set up player avatar
        my.sprite.player = this.physics.add.sprite(20, 0, "platformer_characters", "tile_0000.png");
        my.sprite.player.setCollideWorldBounds(true);

        // Enable collision handling
        this.physics.add.collider(my.sprite.player, this.groundLayer);

        my.vfx.walking = this.add.particles(0, 0, "kenny-particles", {
            frame: ['smoke_03.png', 'smoke_09.png'],
            random: true,
            scale: {start: 0.03, end: 0.05},
            lifespan: 350,
            alpha: {start: 1, end: 0.1}, 
        });

        // Coin collision handler
        this.physics.add.overlap(my.sprite.player, this.coinGroup, (player, coin) => {
            coin.destroy();
            this.collect = this.sound.add('collect',{volume: 0.2});
            this.collect.play();
            this.coinEmitter = this.add.particles(0,0,'kenny-particles', {
            frame: ['star_06.png', 'star_07.png'],
            scale: 0.1,
            speed: { min: 20, max: 60 },
            active: false,
            lifespan: 600,
            alpha: {start: 1, end: 0.1}
        });

            this.coinEmitter.explode(6, coin.x, coin.y);
            this.time.delayedCall(500, () => this.coinEmitter.destroy(), [], this);

            // Update score
            this.score += 100;
            this.scoreText.setText('Score: ' + this.score);
        });

        // Simple camera to follow player
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.cameras.main.startFollow(my.sprite.player, true, 0.25, 0.25);
        this.cameras.main.setDeadzone(50, 50);
        this.cameras.main.setZoom(this.SCALE);
        
        // Add score UI at top-right after camera and world setup
        this.scoreText = this.add.text(this.scale.width - 500 , this.scale.height - 680, 'Score: ' + this.score, {
            fontSize: '20px', fill: '#ffffff',
            stroke: '#000000', strokeThickness: 4
        }).setOrigin(1, 0); 
        this.scoreText.setScrollFactor(0).setDepth(100); 

        this.key_bind();
    }

    update() {
        this.scoreText.setPosition(this.scale.width - 520 , this.scale.height - 730); 

        
        if(this.keys.left.isDown) {
            my.sprite.player.setAccelerationX(-this.ACCELERATION);
            my.sprite.player.resetFlip();
            my.sprite.player.anims.play('walk', true);
            my.vfx.walking.startFollow(my.sprite.player, my.sprite.player.displayWidth/2-10, my.sprite.player.displayHeight/2-5, false);

            my.vfx.walking.setParticleSpeed(this.PARTICLE_VELOCITY, 0);
            if (my.sprite.player.body.blocked.down) {
                my.vfx.walking.start();
            }

        } else if(this.keys.right.isDown) {
            my.sprite.player.setAccelerationX(this.ACCELERATION);
            my.sprite.player.setFlip(true, false);
            my.sprite.player.anims.play('walk', true);
            my.vfx.walking.startFollow(my.sprite.player, my.sprite.player.displayWidth/2-10, my.sprite.player.displayHeight/2-5, false);

            my.vfx.walking.setParticleSpeed(this.PARTICLE_VELOCITY, 0);
            if (my.sprite.player.body.blocked.down) {
                my.vfx.walking.start();
            }

        } else {
            // Set acceleration to 0 and have DRAG take over
            my.sprite.player.setAccelerationX(0);
            my.sprite.player.setDragX(this.DRAG);
            my.sprite.player.anims.play('idle');
            my.vfx.walking.stop();
        }




        if(this.keys.restart.isDown) {
            this.scene.restart();
        }


        this.flag_mechanics();
        this.double_jump_mechanics();

    }

    flag_mechanics()
    {
        const playerTileX = this.groundLayer.worldToTileX(my.sprite.player.x);
        const playerTileY = this.groundLayer.worldToTileY(my.sprite.player.y + my.sprite.player.height / 2); // bottom of player

        const tile = this.decorationLayer.getTileAt(playerTileX, playerTileY);

        if (tile && tile.properties.isFlag && !this.levelCompleted) {
            this.levelCompleted = true;
            this.scene.start("EndScene");
        }
    }

    double_jump_mechanics()
    {
        // player jump
        if(!my.sprite.player.body.blocked.down) {
            my.sprite.player.anims.play('jump');
        }
        let isOnGround = my.sprite.player.body.blocked.down;

        // Reset jump count only when landing
        if (isOnGround && !this.wasOnGround) {
            this.jumpCount = 0;
        }

        // Handle jump input
        if (Phaser.Input.Keyboard.JustDown(this.keys.up) && this.jumpCount < this.maxJumps) {
            if (this.jumpCount === 0) {
                my.sprite.player.setVelocityY(this.JUMP_VELOCITY);
                
            } else {
                my.sprite.player.setVelocityY(this.JUMP_VELOCITY * 0.8);
            }
            this.jump = this.sound.add('jump',{volume: 0.2});
            this.jump.play();
            this.jumpCount++;
        }

        this.wasOnGround = isOnGround;


    }

    key_bind()
    {
        // set up Phaser-provided cursor key input
        this.keys = this.input.keyboard.addKeys({
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D,
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        restart: Phaser.Input.Keyboard.KeyCodes.R
        });
    }

    map_setting()
    {
        this.map = this.add.tilemap("level1");

        // Add a tileset to the map
        this.tileset = this.map.addTilesetImage("Pixel_Platformer", "tiles");
        this.bgTileset = this.map.addTilesetImage("tilemap-backgrounds_packed", "backgrounds");

        // Create a layer
        this.backgroundLayer = this.map.createLayer("Background", this.bgTileset);

        this.groundLayer = this.map.createLayer("Ground", this.tileset);

        this.decorationLayer = this.map.createLayer("Decoration", this.tileset);

        this.pBackgroundLayer = this.map.createLayer("P_Background", this.tileset);
        
        this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);

        this.groundLayer.setCollisionByProperty({ collides: true });

    }

    background_music(){
    this.bgm = this.sound.add('bgm', {
        loop: true,
        volume: 0.5
    });
    this.bgm.play();
    }
}