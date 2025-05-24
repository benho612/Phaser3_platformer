// Jim Whitehead
// Created: 4/14/2024
// Phaser: 3.70.0

"use strict"

// game config
let config = {
    parent: 'phaser-game',
    type: Phaser.CANVAS,
    render: { pixelArt: true },
    width: 700,
    height: 500,
    scene: [start_scene, game_scene, end_scene], 
    physics: {default: 'arcade'},
    fps: { forceSetTimeOut: true, target: 60 }
}


const game = new Phaser.Game(config);

game.scene.start("main_menu");
 
