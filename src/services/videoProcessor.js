import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import db from '../models/index.js';
import { calculateBilling } from './billingService.js';

const { Video } = db;


const usarDockerFFmepg = async () => {
  try {
    
    const { execSync } = await import('child_process');
    execSync('docker --version', { stdio: 'ignore' });
    
    console.log('🐳 Usando FFmpeg via Docker como fallback');
    
    
    ffmpeg.setFfmpegPath('docker');
    ffmpeg.setFfprobePath('docker');
    
    
    const originalCommand = ffmpeg.prototype._getArguments;
    ffmpeg.prototype._getArguments = function() {
      const args = originalCommand.call(this);
      return ['run', '--rm', '-v', `${process.cwd()}:/workspace`, '-w', '/workspace', 'linuxserver/ffmpeg', 'ffmpeg'].concat(args);
    };
    
    return true;
  } catch (error) {
    console.log('❌ Docker não disponível');
    return false;
  }
};


const possibleFFmpegPaths = [
  '/usr/bin/ffmpeg',           
  '/usr/local/bin/ffmpeg',     
  '/opt/homebrew/bin/ffmpeg',  
  'ffmpeg',                    
  path.join(process.cwd(), 'scripts/ffmpeg-docker') 
];

const possibleFFprobePaths = [
  '/usr/bin/ffprobe',          
  '/usr/local/bin/ffprobe',    
  '/opt/homebrew/bin/ffprobe', 
  'ffprobe',                   
  path.join(process.cwd(), 'scripts/ffprobe-docker') 
];

let ffmpegFound = false;
let ffprobeFound = false;


for (const ffmpegPath of possibleFFmpegPaths) {
  try {
    
    if (ffmpegPath.startsWith('/') && fs.existsSync(ffmpegPath)) {
      ffmpeg.setFfmpegPath(ffmpegPath);
      console.log(`✅ FFmpeg encontrado em: ${ffmpegPath}`);
      ffmpegFound = true;
      break;
    }
    
    else if (!ffmpegPath.startsWith('/')) {
      ffmpeg.setFfmpegPath(ffmpegPath);
      console.log(`✅ FFmpeg configurado como: ${ffmpegPath}`);
      ffmpegFound = true;
      break;
    }
  } catch (e) {
    
  }
}


for (const ffprobePath of possibleFFprobePaths) {
  try {
    
    if (ffprobePath.startsWith('/') && fs.existsSync(ffprobePath)) {
      ffmpeg.setFfprobePath(ffprobePath);
      console.log(`✅ FFprobe encontrado em: ${ffprobePath}`);
      ffprobeFound = true;
      break;
    }
    
    else if (!ffprobePath.startsWith('/')) {
      ffmpeg.setFfprobePath(ffprobePath);
      console.log(`✅ FFprobe configurado como: ${ffprobePath}`);
      ffprobeFound = true;
      break;
    }
  } catch (e) {
    
  }
}


if (!ffmpegFound || !ffprobeFound) {
  console.log('❌ FFmpeg/FFprobe não encontrado no sistema');
  console.log('💡 Para instalar no macOS: brew install ffmpeg');
  console.log('💡 Para instalar no Ubuntu: sudo apt install ffmpeg');
}


const testarFFmepg = async () => {
  return new Promise((resolve, reject) => {
    import('child_process').then(({ exec }) => {
      const ffmpegPath = possibleFFmpegPaths.find(path => {
        try {
          return path.startsWith('/') ? fs.existsSync(path) : true;
        } catch {
          return false;
        }
      }) || 'ffmpeg';
      
      const command = `"${ffmpegPath}" -version`;
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error('❌ FFmpeg teste falhou:', error);
          reject(error);
        } else {
          console.log('✅ FFmpeg teste bem-sucedido');
          console.log('FFmpeg version:', stdout.split('\n')[0]);
          resolve();
        }
      });
    }).catch(reject);
  });
};

const processVideoToHLS = async (videoId, inputPath, customThumbnailPath = null) => {
  try {
    console.log(`Iniciando processamento do vídeo ${videoId}`);
    
    
    await testarFFmepg();
    
    
    const outputDir = path.join(process.env.PROCESSED_PATH || './processed', videoId);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Arquivo de entrada não encontrado: ${inputPath}`);
    }

    
    const videoInfo = await obterInformacoesVideo(inputPath);
    const { width, height, duration } = videoInfo;
    const originalResolution = `${width}x${height}`;
    
    console.log(`Vídeo original: ${originalResolution}, duração: ${duration}s`);

    
    const resolutions = obterResolucaoDisponivel(width, height);
    console.log(`Resoluções a serem processadas:`, resolutions.map(r => `${r.width}x${r.height}`));

    
    let thumbnailPath = customThumbnailPath;
    if (!thumbnailPath) {
      thumbnailPath = await gerarMiniaturia(inputPath, outputDir, duration);
    }

    
    await processarMultiplasResolucoes(inputPath, outputDir, resolutions);

    
    const masterPlaylistPath = await criarPlaylistPrincipall(outputDir, resolutions);

    
    await Video.update({
      status: 'completed',
      hls_path: `/processed/${videoId}/master.m3u8`,
      thumbnail_path: thumbnailPath ? `/processed/${videoId}/thumbnail.jpg` : null,
      duration: Math.ceil(duration),
      original_resolution: originalResolution,
      available_resolutions: resolutions.map(r => `${r.width}x${r.height}`)
    }, {
      where: { id: videoId }
    });

    
    await calculateBilling(videoId, duration);

    
    fs.unlinkSync(inputPath);
    
    console.log(`Vídeo ${videoId} processado com sucesso`);
    return { resolutions, thumbnailPath, duration };

  } catch (error) {
    console.error(`Erro processamento vídeo ${videoId}:`, error);
    await updateVideoStatus(videoId, 'failed');
    throw error;
  }
};

const obterInformacoesVideo = (inputPath) => {
  return new Promise((resolve, reject) => {
    
    import('child_process').then(({ exec }) => {
      const ffprobePath = possibleFFprobePaths.find(path => {
        try {
          return path.startsWith('/') ? fs.existsSync(path) : true; 
        } catch {
          return false;
        }
      }) || 'ffprobe';
      
      const command = `"${ffprobePath}" -v quiet -print_format json -show_format -show_streams "${inputPath}"`;
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error('FFprobe error:', error);
          reject(error);
        } else {
          try {
            const metadata = JSON.parse(stdout);
            const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
            const duration = metadata.format.duration;
            
            if (!videoStream) {
              throw new Error('No video stream found in file');
            }
            
            resolve({
              width: videoStream.width,
              height: videoStream.height,
              duration: parseFloat(duration)
            });
          } catch (parseError) {
            console.error('Error parsing video metadata:', parseError);
            reject(parseError);
          }
        }
      });
    }).catch(reject);
  });
};

const obterResolucaoDisponivel = (originalWidth, originalHeight) => {
  
  const targetResolution = { width: 640, height: 360, name: '360p', bitrate: '800k', maxrate: '1200k' };
  
  
  if (originalWidth < targetResolution.width || originalHeight < targetResolution.height) {
    return [{
      width: originalWidth,
      height: originalHeight,
      name: `${originalHeight}p`,
      bitrate: '800k',
      maxrate: '1200k'
    }];
  }
  
  
  return [targetResolution];
};

const gerarMiniaturia = (inputPath, outputDir, duration) => {
  return new Promise((resolve, reject) => {
    const thumbnailPath = path.join(outputDir, 'thumbnail.jpg');
    
    
    const minTime = duration * 0.15; 
    const maxTime = duration * 0.25; 
    const randomTime = Math.random() * (maxTime - minTime) + minTime;
    const seekTime = Math.floor(randomTime);

    ffmpeg(inputPath)
      .seekInput(seekTime)
      .frames(1)
      .size('1280x720')
      .format('mjpeg') 
      .output(thumbnailPath)
      .on('end', () => {
        console.log(`Thumbnail gerada com sucesso aos ${seekTime}s (${Math.round((seekTime/duration)*100)}% do vídeo - frame aleatório entre 15% e 25%)`);
        resolve(thumbnailPath);
      })
      .on('error', (error) => {
        console.error('Erro ao gerar thumbnail:', error);
        reject(error);
      })
      .run();
  });
};

const processarMultiplasResolucoes = async (inputPath, outputDir, resolutions) => {
  const promises = resolutions.map(resolution => {
    return new Promise((resolve, reject) => {
      import('child_process').then(({ exec }) => {
        const outputPath = path.join(outputDir, `${resolution.name}.m3u8`);
        const segmentPath = path.join(outputDir, `${resolution.name}_%03d.ts`);
        
        const ffmpegPath = possibleFFmpegPaths.find(path => {
          try {
            return path.startsWith('/') ? fs.existsSync(path) : true;
          } catch {
            return false;
          }
        }) || 'ffmpeg';
        
        const command = `"${ffmpegPath}" -i "${inputPath}" -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k -s ${resolution.width}x${resolution.height} -b:v ${resolution.bitrate} -hls_time 6 -hls_list_size 0 -hls_segment_filename "${segmentPath}" -f hls "${outputPath}"`;
        
        console.log(`Processando ${resolution.name}: ${command}`);
        
        exec(command, (error, stdout, stderr) => {
          if (error) {
            console.error(`Erro processando ${resolution.name}:`, error);
            console.error(`Stderr: ${stderr}`);
            console.error(`Stdout: ${stdout}`);
            reject(error);
          } else {
            console.log(`${resolution.name} processado com sucesso`);
            console.log(`FFmpeg stdout: ${stdout}`);
            resolve();
          }
        });
      }).catch(reject);
    });
  });

  await Promise.all(promises);
};

const criarPlaylistPrincipall = async (outputDir, resolutions) => {
  const masterPlaylistPath = path.join(outputDir, 'master.m3u8');
  
  let content = '#EXTM3U\n#EXT-X-VERSION:3\n\n';
  
  resolutions.forEach(resolution => {
    const bandwidth = parseInt(resolution.bitrate) * 1000; 
    content += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${resolution.width}x${resolution.height}\n`;
    content += `${resolution.name}.m3u8\n`;
  });
  
  fs.writeFileSync(masterPlaylistPath, content);
  console.log('Master playlist criada:', masterPlaylistPath);
  return masterPlaylistPath;
};

const getVideoDuration = (inputPath) => {
  return new Promise((resolve, reject) => {
    
    import('child_process').then(({ exec }) => {
      const ffprobePath = possibleFFprobePaths.find(path => {
        try {
          return path.startsWith('/') ? fs.existsSync(path) : true; 
        } catch {
          return false;
        }
      }) || 'ffprobe';
      
      const command = `"${ffprobePath}" -v quiet -print_format json -show_format "${inputPath}"`;
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error('FFprobe error getting duration:', error);
          reject(error);
        } else {
          try {
            const metadata = JSON.parse(stdout);
            const duration = parseFloat(metadata.format.duration);
            resolve(duration);
          } catch (parseError) {
            console.error('Error parsing duration:', parseError);
            reject(parseError);
          }
        }
      });
    }).catch(reject);
  });
};

const updateVideoStatus = async (videoId, status) => {
  try {
    await Video.update(
      { status },
      { where: { id: videoId } }
    );
  } catch (error) {
    console.error(`Erro ao atualizar status do vídeo ${videoId}:`, error);
  }
};

export { processVideoToHLS };