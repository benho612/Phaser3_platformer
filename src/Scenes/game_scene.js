class game_scene extends Phaser.Scene {
    constructor() {
        super("game_scene");
    }

    init() {
        // variables and settings
        this.ACCELERATION = 600;     // Faster start
        this.DRAG = 1200;            // Less sliding
        this.physics.world.gravity.y = 1500;
        this.JUMP_VELOCITY = -400;
        this.PARTICLE_VELOCITY = 50;
        this.SCALE = 2.0;

        this.wasOnGround = false;
        this.jumpCount = 0;
        this.maxJumps = 2;

        this.score = 0;
        this.levelCompleted = false;
        this.levelFailed = false;
        this.isPaused = false;

        this.npcDialogLines = [
            "Hello traveler!",
            "Nice day, isn't it?",
            "Be careful ahead!",
            "That's all I know."
        ];
        this.npcDialogIndex = 0;
        this.inNpcZone = false;
        this.inDialogue = false;

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

        this.water_tile_sfx();

        //set npc 
        my.sprite.npc = this.physics.add.sprite(350, 0, 'platformer_characters', 'tile_0009.png');
        this.physics.add.collider(my.sprite.npc, this.groundLayer);

        this.npcText = this.add.text(my.sprite.npc.x, my.sprite.npc.y - 40, 'Press E to talk', {
            fontFamily: 'PixelFont',
            fontSize: '10px',
            color: '#ffffff',
            stroke: '#000',
            strokeThickness: 3
        }).setOrigin(0.5);

        this.npcTextBox = this.add.text(my.sprite.npc.x, my.sprite.npc.y - 40, '', {
            fontFamily: 'PixelFont',
            fontSize: '10px',
            fill: '#ffffff',
            stroke: '#000',
            strokeThickness: 3
        }).setOrigin(0.5).setVisible(false);

        // set up player avatar
        my.sprite.player = this.physics.add.sprite(20, 0, "platformer_characters", "tile_0000.png");
        my.sprite.player.setCollideWorldBounds(true);
        my.sprite.player.setMaxVelocity(200, 600); // tight, capped control
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

            this.score += 100;
            this.coinEmitter.explode(6, coin.x, coin.y);
            this.time.delayedCall(500, () => this.coinEmitter.destroy(), [], this);
        });

        // Overlap detection
        this.physics.add.overlap(my.sprite.player, my.sprite.npc, () => {
            this.inNpcZone = true;
        }, null, this);

        this.scoreBox = this.add.text(my.sprite.player.x, my.sprite.player.y - 40, this.score, {
            fontFamily: 'PixelFont',
            fontSize: '10px',
            fill: '#ffffff',
            stroke: '#000',
            strokeThickness: 3
        }).setOrigin(0.5);

        this.camera();

        this.key_bind();
    }

    update() {
        this.scoreBox.setText(this.score);
        this.scoreBox.setPosition(my.sprite.player.x, my.sprite.player.y + 40);
        this.show_interact_npc();

        if (this.inNpcZone && Phaser.Input.Keyboard.JustDown(this.keys.E)) 
        {
            this.inDialogue = true;
            this.showNpcMessage(this.npcDialogLines[this.npcDialogIndex]);
            this.npcDialogIndex++;
            if (this.npcDialogIndex > this.npcDialogLines.length)
            {
                this.npcDialogIndex = 0;
                this.inDialogue = false;
            }
        } 

        // Get player's bottom center tile coordinates
        const playerTileX = this.groundLayer.worldToTileX(my.sprite.player.x);
        const playerTileY = this.groundLayer.worldToTileY(my.sprite.player.y + my.sprite.player.height / 2);

        // Check the tile at that position
        const currentTile = this.groundLayer.getTileAt(playerTileX, playerTileY);

        // Determine if player is in water
        const inWater = currentTile && currentTile.properties.water;

        if (inWater) {
            // Apply underwater physics
            this.physics.world.gravity.y = 400;
            my.sprite.player.setDragX(800);
            my.sprite.player.setMaxVelocity(100, 250);
            my.sprite.player.setTint(0x80d0ff);  // Optional: visual cue
        } else {
            // Normal physics
            this.physics.world.gravity.y = 1500;
            my.sprite.player.setDragX(this.DRAG);
            my.sprite.player.setMaxVelocity(200, 600);
            my.sprite.player.clearTint();
        }

        // Check if the player is on a ladder tile
        const ladderTile = this.groundLayer.getTileAtWorldXY(
            my.sprite.player.x,
            my.sprite.player.y + my.sprite.player.height / 2
        );

        const onLadder = ladderTile && ladderTile.properties.ladder;
        if (onLadder && this.keys.up.isDown) {
            // Climbing behavior
            this.physics.world.gravity.y = 0;
            my.sprite.player.setVelocityY(-100);   // Climb speed
            my.sprite.player.setDragX(800);
            my.sprite.player.setAccelerationX(0);  // Prevent horizontal drifting
            my.sprite.player.setMaxVelocity(150, 150);
            my.sprite.player.setTint(0xffddaa);    // Optional visual cue
        } else if (!onLadder) {
            // Restore normal physicsd
            this.physics.world.gravity.y = 1500;
            my.sprite.player.clearTint();
        }

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

        this.win_lose_mechanics();
        this.double_jump_mechanics();

    }

    win_lose_mechanics()
    {
        const playerTileX = this.groundLayer.worldToTileX(my.sprite.player.x);
        const playerTileY = this.groundLayer.worldToTileY(my.sprite.player.y + my.sprite.player.height / 2); // bottom of player

        const tile = this.decorationLayer.getTileAt(playerTileX, playerTileY);

        const deathTile = this.groundLayer.getTileAt(playerTileX,playerTileY);


        if (tile && tile.properties.isFlag && !this.levelCompleted) {
            this.levelCompleted = true;
            this.scene.start("end_scene", { result: "completed", score: this.score });
            this.bgm.stop();
        }

        if(deathTile && deathTile.properties.isDie &&!this.levelCompleted){
            this.levelFailed = true;
            this.scene.start("end_scene", { result: "failed", score: this.score });
            this.bgm.stop();
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
        E: Phaser.Input.Keyboard.KeyCodes.E
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
        //this.backgroundLayer.setScale(this.SCALE);

        this.groundLayer = this.map.createLayer("Ground", this.tileset);
        //this.groundLayer.setScale(this.SCALE);

        this.decorationLayer = this.map.createLayer("Decoration", this.tileset);
        //this.decorationLayer.setScale(this.SCALE);

        this.pBackgroundLayer = this.map.createLayer("P_Background", this.tileset);
        //this.pBackgroundLayer.setScale(this.SCALE);

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

    water_tile_sfx(){
        this.waterTiles = this.groundLayer.filterTiles(tile => {
            return tile.properties.water == true;
        });

        this.waterTiles.forEach(tile => {
            this.waterEmitter = this.add.particles(tile.getCenterX(),tile.getCenterY(),'kenny-particles', {
            frame: 'smoke_03.png',
            lifespan: { min: 1000, max: 2000 },
            speedY: { min: -30, max: -60 },
            scale: { start: 0.1, end: 0 },
            alpha: { start: 0.5, end: 0 },
            frequency: 100
            })
        });
    }

    camera(){
        // Simple camera to follow player
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.cameras.main.startFollow(my.sprite.player, true, 0.25, 0.25);
        this.cameras.main.setDeadzone(50, 50);
        this.cameras.main.setZoom(2);//this.SCALE
    }

    showNpcMessage(message) {
        this.npcTextBox.setText(message);
        this.npcTextBox.setPosition(my.sprite.npc.x, my.sprite.npc.y - 40);
        this.npcTextBox.setVisible(true);
    }

    show_interact_npc(){
        //Npc Overlap
        if (!this.physics.overlap(my.sprite.player, my.sprite.npc)) 
            this.inNpcZone = false;
        else
            this.inNpcZone = true;

        this.npcText.setPosition(my.sprite.npc.x, my.sprite.npc.y - 40);

        if (this.inNpcZone && !this.inDialogue)
            this.npcText.setVisible(true);
        else
            this.npcText.setVisible(false);
        
    }

}