const {spawn}=require('node:child_process');
const [command,...args]=process.argv.slice(2);
const child=spawn(command,args,{shell:process.platform==='win32',stdio:['ignore','pipe','pipe']});
let log='';child.stdout.on('data',data=>{log+=data;process.stdout.write(data);});child.stderr.on('data',data=>{log+=data;process.stderr.write(data);});
const timer=setTimeout(()=>{console.error('STOPPED: command exceeded 2 minutes.');spawn('taskkill',['/PID',String(child.pid),'/T','/F'],{stdio:'ignore'});process.exitCode=124;},120000);
child.on('error',error=>{clearTimeout(timer);console.error(error.message);process.exitCode=1;});
child.on('exit',code=>{clearTimeout(timer);if(process.env.COMMAND_LOG)require('node:fs').writeFileSync(process.env.COMMAND_LOG,log);process.exitCode=process.exitCode||code||0;});
