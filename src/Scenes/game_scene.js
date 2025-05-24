class game_scene extends Phaser.Scene {
  constructor() {
      super("game_scene");

      this.my = {
          sprite: {},
          bullets: [],
          enemies: [],
          hearts: [],
          text: {}
      };

      this.bodyX = 350;
      this.bodyY = 450;

     // Define paths here
     this.zigzagPath = [
        { x: 50, y: 100 },
        { x: 120, y: 200 },
        { x: 200, y: 150 },
        { x: 300, y: 300 }
    ];

    this.divePath = [
        { x: 600, y: 50 },
        { x: 500, y: 250 },
        { x: 400, y: 450 }
    ]; 

    this.goAroundPath = [
        {x: 0, y: 100},
        {x: 500, y: 200},
        {x: 0, y: 100},
        {x: 500, y: 200}
    ];

    this.spiralPath = [
        { x: 650, y: 0 },
        { x: 550, y: 100 },
        { x: 450, y: 200 },
        { x: 350, y: 300 },
        { x: 250, y: 400 }
    ];
    
    this.vZigzagPath = [
        { x: 100, y: 0 },
        { x: 200, y: 80 },
        { x: 100, y: 160 },
        { x: 200, y: 240 },
        { x: 100, y: 320 }
    ];
    
    this.swoopPath = [
        { x: 400, y: 0 },
        { x: 300, y: 100 },
        { x: 500, y: 200 },
        { x: 300, y: 300 },
        { x: 400, y: 400 }
    ];

    this.lDownPath = [
        { x: 0, y: 100 },
        { x: 0, y: 300 },
        { x: 200, y: 300 }
    ];
    
    this.canBeHit = true;
  }

  preload() {
      this.load.setPath("./assets/");
      this.load.atlasXML("SpaceInvader", "Sprite/Spritesheet/sheet.png", "Sprite/Spritesheet/sheet.xml");
      this.load.image("heart","Sprite/PNG/UI/playerLife1_blue.png");
      this.load.image("spaceBG","Sprite/Backgrounds/darkPurple.png");
      this.load.audio('bgm', 'Audio/bgm.mp3');
      this.load.audio('shooting','Audio/laser_shooting.wav');
      this.load.audio('explode', 'Audio/explosionCrunch_000.ogg');

  }

  create() {
    
        //Background
        this.bg = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, 'spaceBG')
        .setOrigin(0, 0)
        .setScrollFactor(0);
    
        //Timer for end_scene
        this.startTime = this.time.now;

        //audio
        this.background_music();

        //player
        this.player_setting();

        //UI
        this.ui_setting();

        // PHYSICS GROUPS
        this.bulletGroup = this.physics.add.group();
        this.enemyGroup = this.physics.add.group();
        this.enemyBulletGroup = this.physics.add.group();

        this.resetGameState();

        //enemies mechanics
        this.startLevel(this.level);
    
        //collision
        this.collision_everything();
  }

  update() {
      let my = this.my;

      this.bg.tilePositionY -= 1;  // Adjust speed as desired

      // PLAYER MOVEMENT
      if (this.keys.left.isDown) {
          my.sprite.player.x -= 5;
      } else if (this.keys.right.isDown) {
          my.sprite.player.x += 5;
      }

      this.shoot_mechanics();

      //if enemies are cleared, go to next level
      if (this.my.enemies.length > 0) {
        this.my.enemies = this.my.enemies.filter(e => e.active);
        if (this.my.enemies.length === 0) {
            this.level++;
            if (this.level <= 5) {
                this.startLevel(this.level);
            } else {
                this.goToEndScene();
            }
        }
    }
  }

    // PLAYER TAKES DAMAGE
    playerHit() {
    if (!this.canBeHit) return;

    this.canBeHit = false;
    this.currentHearts--;
    this.updateHealthDisplay();

      // Start blinking effect
      this.tweens.add({
        targets: this.my.sprite.player,
        alpha: 0,
        ease: 'Linear',
        duration: 100,
        yoyo: true,
        repeat: 5
    });

    if (this.currentHearts <= 0) {
        this.goToEndScene();
    } else {
        // Wait 1 second before allowing another hit
        this.time.delayedCall(1000, () => {
            this.canBeHit = true;
        });
    }
  }

    // UPDATE HEART DISPLAY
    updateHealthDisplay() {
      for (let i = 0; i < this.maxHearts; i++) {
          this.my.hearts[i].setVisible(i < this.currentHearts);
      }
  }

    // ADD TO SCORE
    addScore(points) {
      this.score += points;
      this.my.text.score.setText(`Score: ${this.score}`);
  }

    //random spawn enemy
    spawnEnemy(path, duration = 999999, delay = 0) {
        this.time.delayedCall(delay, ()=> {        
            const frames = ["enemyBlack1.png", "enemyGreen4.png", "enemyRed2.png", "enemyBlue3.png"];
            const frame = Phaser.Utils.Array.GetRandom(frames);
    
            let curve = new Phaser.Curves.Spline(path);
    
            let enemy = this.add.follower(curve, path[0].x, path[0].y, 'SpaceInvader', frame);
            enemy.setScale(0.5);
            this.physics.add.existing(enemy);
            this.enemyGroup.add(enemy);
    
            enemy.startFollow({
                duration: duration,
                repeat: -1,
                rotateToPath: true,
                rotationOffset: -90,
                yoyo: true,
            });
    
            this.my.enemies.push(enemy);

        });

  }

    //background music
    background_music() {
    this.bgm = this.sound.add('bgm', {
        loop: true,
        volume: 0.5
    });
    this.bgm.play();
}

    //shoot mechanics
    shoot_mechanics() {
    let my = this.my;

      // SHOOT
      if (Phaser.Input.Keyboard.JustDown(this.keys.shoot)) {
        this.shoot = this.sound.add('shooting',{volume: 0.2});
        this.shoot.play();
        const bullet = this.bulletGroup.create(my.sprite.player.x, my.sprite.player.y - 20, "SpaceInvader", "fire01.png");
        bullet.setFlipY(true);
        bullet.setAngle(180);
        bullet.setScale(0.5);
        bullet.body.velocity.y = -200;
        this.my.bullets.push(bullet);
    }

      // BULLET MOVEMENT & CLEANUP
      for (let i = my.bullets.length - 1; i >= 0; i--) {
          my.bullets[i].y -= 5;
          if (my.bullets[i].y < 0) {
              my.bullets[i].destroy();
              my.bullets.splice(i, 1);
          }
      }

      this.enemyBulletGroup.children.each(bullet => {
        if (bullet.y > this.scale.height) {
            bullet.destroy();
        }
    }, this);
    
}

    //UI for main game
    ui_setting() {

        let my = this.my;

        //Clear existing hearts if any
        my.hearts.forEach(heart => heart.destroy());
        my.hearts = [];

        this.maxHearts = 4;
        this.currentHearts = 4;
        for (let i = 0; i < this.maxHearts; i++) {
            let heart = this.add.sprite(this.scale.width - 30 - i * 35, 20, "heart")
                .setScale(0.8)
                .setOrigin(0.5, 0);
            my.hearts.push(heart);
        }

        // SCORE SETUP
        this.score = 0;
        my.text.score = this.add.text(this.scale.width - 30, 60, `Score: ${this.score}`, {
            fontSize: "18px",
            fill: "#ffffff"
        }).setOrigin(1, 0);

        //LEVEL UI
        this.level = 1;
        this.levelText = this.add.text(this.scale.width / 2, this.scale.height / 2, '', {
            fontSize: '32px',
            fill: '#ffffff'
        }).setOrigin(0.5);
    }

    //collision for the bullet & player & enemies
    collision_everything() {

        let my = this.my;
        // COLLISION: player with enemies
        this.physics.add.overlap(this.enemyGroup, my.sprite.player, () => {
            this.playerHit();
        });

        //COLLISION: player get hit by enemies
        this.physics.add.overlap(this.enemyBulletGroup, this.my.sprite.player, () => {
        this.playerHit();
    });
    
        // COLLISION: bullets hit enemies
        this.physics.add.overlap(this.bulletGroup, this.enemyGroup, (bullet, enemy) => {
            bullet.destroy();
            enemy.destroy();
            this.addScore(100);
            this.sound.play('explode', { volume: 0.3 });
        });
    }

    //player configuration
    player_setting(){
        let my = this.my;

        my.sprite.player = this.physics.add.sprite(this.bodyX, this.bodyY, 'SpaceInvader', 'playerShip1_blue.png');
        my.sprite.player.setScale(0.5);
        my.sprite.player.setCollideWorldBounds(true);

        // INPUT 
        this.keys = this.input.keyboard.addKeys({
            left: 'A',
            right: 'D',
            shoot: 'SPACE'
        });
    }

    //Level 1-5
    startLevel(level) {
        this.levelText.setText(`Level ${level}`);
        this.time.delayedCall(2000, () => {
            this.levelText.setText('');
  
            this.my.enemies.forEach(e => e.destroy());
            this.my.enemies = [];
  
            for (let i = 0; i < 5 + level * 3; i++) {
                const path = Phaser.Utils.Array.GetRandom([
                    this.zigzagPath, this.divePath, this.goAroundPath, this.spiralPath, this.vZigzagPath, this.lDownPath, this.swoopPath

                ]);
                this.spawnEnemy(path, 4000 + Math.random() * 2000, i * 700);
            }
  
            if (!this.enemyShootTimer) {
                this.enemyShootTimer = this.time.addEvent({
                    delay: 2000,
                    loop: true,
                    callback: () => {
                        this.my.enemies.forEach(enemy => {
                            if (enemy.active && enemy.y < this.scale.height) {
                                const bullet = this.enemyBulletGroup.create(enemy.x, enemy.y + 10, "SpaceInvader", "fire02.png");
                                bullet.setFlipY(false);
                                bullet.setAngle(180);
                                bullet.setScale(0.5);
                                bullet.body.velocity.y = 150;
                            }
                        });
                    }
                });
            }
        });
    }

    //credit + end scene
    goToEndScene() {
        const totalTime = this.time.now - this.startTime;
        this.scene.start("end_scene", {
            score: this.score,
            time: totalTime
        });

        if (this.bgm && this.bgm.isPlaying) {
            this.bgm.stop();
        }
    }

    //reset every to make sure game works properly
    resetGameState() {
        this.level = 1;
        this.score = 0;
        this.startTime = 0;
        this.canBeHit = true;
    
        this.my.enemies = [];
        this.my.bullets = [];
    
        if (this.enemyShootTimer) {
            this.enemyShootTimer.remove();
            this.enemyShootTimer = null;
        }
    
        // Optional: clear all active bullets/enemies from previous game
        this.enemyGroup.clear(true, true);
        this.bulletGroup.clear(true, true);
        this.enemyBulletGroup.clear(true, true);
    }
    
}