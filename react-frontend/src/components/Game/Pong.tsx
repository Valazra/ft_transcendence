import React, { useRef, useEffect, useState } from 'react';

interface PongProps {
  gameState: GameState | null;
  gameOptions: { mapStyle: string, gameplayStyle: string } | null;
}

interface GameState {
  ballPosition: {
    x: number,
    y: number
  },
  player1PaddlePosition: number,
  player2PaddlePosition: number,
  paddleSpeed: number,
  ballSpeed: {
    x: number,
    y: number
  },
  player1Score: number,
  player2Score: number
}

const Pong: React.FC<PongProps> = ({ gameState, gameOptions }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [animationFrameId, setAnimationFrameId] = useState(0);

  const defaultGameState: GameState = {
    ballPosition: { x: 50, y: 50 },
    player1PaddlePosition: 50,
    player2PaddlePosition: 50,
    paddleSpeed: 0,
    ballSpeed: { x: 0, y: 0 },
    player1Score: 0,
    player2Score: 0
  };


  useEffect(() => {
    const resizeCanvas = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  const draw = (context: CanvasRenderingContext2D, gameState: GameState) => {
  
    const gameWidth = context.canvas.width;
    const gameHeight = context.canvas.height;
    const paddleWidth = gameWidth * 0.01;
    const paddleHeight = gameHeight * 0.15; 
    const ballRadius = gameWidth * 0.01; 

    let backgroundColor = '#000';
    let paddleColor = '#fff';
    let ballColor = '#fff';
  
    if (gameOptions && gameOptions.mapStyle === 'alien') {
      backgroundColor = '#0F1927';
      paddleColor = '#21FC0D';
      ballColor = '#FE53BB';
    }
    else if (gameOptions && gameOptions.mapStyle === 'underwater') {
      backgroundColor = '#000033';
      paddleColor = '#FFD700';
      ballColor = '#1E90FF';
    }
  
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, gameWidth, gameHeight);

    context.fillStyle = paddleColor;
    context.fillRect(0, gameState.player1PaddlePosition / 100 * gameHeight, paddleWidth, paddleHeight);
    context.fillRect(gameWidth - paddleWidth, gameState.player2PaddlePosition / 100 * gameHeight, paddleWidth, paddleHeight);

    if (gameState.ballPosition) {
      const ballX = gameState.ballPosition.x / 100 * gameWidth;
      const ballY = gameState.ballPosition.y / 100 * gameHeight;

      context.beginPath();
      context.arc(ballX, ballY, ballRadius, 0, Math.PI * 2, false);
      context.fillStyle = ballColor;
      context.fill();
    }
    const scoreFontSize = gameWidth * 0.05;
    context.font = `${scoreFontSize}px Arial`;
    context.fillText(gameState.player1Score.toString(), gameWidth * 0.25, gameHeight * 0.1); // Player 1 score
    context.fillText(gameState.player2Score.toString(), gameWidth * 0.75, gameHeight * 0.1); // Player 2 score
  
}

useEffect(() => {
  const canvas = canvasRef.current;
  const context = canvas?.getContext('2d');

  if (context && gameState) {
    draw(context, gameState);
  }
  else if (context)
  {
    draw(context, defaultGameState);
  }
  if (context && gameState) {
    const id = requestAnimationFrame(() => draw(context, gameState));
    setAnimationFrameId(id);
  }
  return () => {
    cancelAnimationFrame(animationFrameId);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [gameState]);

return <canvas ref={canvasRef} style={{ width: '90%', height: '90%' }} />;
}

export default Pong;