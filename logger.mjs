
// const util = require( 'node:util' );
// const process = require( 'process' );
import { preventUndefined, unprevent } from 'prevent-undefined' ;
import { logger_console ,create_logger_console } from "./logger-console.mjs" ;

const sanitizeAnsi = (s)=>
  typeof s ==='string' ? s.replace( /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '' ) : s;

const recursivelySanitizeAnsi = (obj,stack=[])=>{
  // if ( stack.includes(obj) ) {
  //   console.log('found a circular reference');
  //   return obj;
  // } else {
  //   stack.push ( obj );
  // }

  if ( typeof obj === 'object' && obj !== null ) {
    Object.getOwnPropertyNames( obj ).forEach((key)=>{
      const value = obj[key];
      const new_value = recursivelySanitizeAnsi( value, stack );
      if ( value !== new_value ) {
        obj[key] = new_value;
      }
    });
    return obj;
  } else {
    return sanitizeAnsi( obj );
  }
};


const TERM_RESET      = "\x1b[0m" ;
const TERM_BRIGHT     = "\x1b[1m" ;
const TERM_DIM        = "\x1b[2m" ;
const TERM_UNDERSCORE = "\x1b[4m" ;
const TERM_BLINK      = "\x1b[5m" ;
const TERM_REVERSE    = "\x1b[7m" ;
const TERM_HIDDEN     = "\x1b[8m" ;

const TERM_FG_BLACK   = "\x1b[30m";
const TERM_FG_RED     = "\x1b[31m";
const TERM_FG_GREEN   = "\x1b[32m";
const TERM_FG_YELLOW  = "\x1b[33m";
const TERM_FG_BLUE    = "\x1b[34m";
const TERM_FG_MAGENTA = "\x1b[35m";
const TERM_FG_CYAN    = "\x1b[36m";
const TERM_FG_WHITE   = "\x1b[37m";

const TERM_BG_BLACK   = "\x1b[40m";
const TERM_BG_RED     = "\x1b[41m";
const TERM_BG_GREEN   = "\x1b[42m";
const TERM_BG_YELLOW  = "\x1b[43m";
const TERM_BG_BLUE    = "\x1b[44m";
const TERM_BG_MAGENTA = "\x1b[45m";
const TERM_BG_CYAN    = "\x1b[46m";
const TERM_BG_WHITE   = "\x1b[47m";


const writeLog = async(...args)=>logger_console.log( ...args );

const writeDirOptions = {
  colors         : true,
  depth          : null,
  maxArrayLength : null,
};

const writeDir = async (arg)=>logger_console.dir( arg, writeDirOptions );


class ConsoleLogger {
  async beginReport( nargs ) {
    const {
      name,
    } = nargs;
    await writeLog( '='.repeat(80) );
    await writeLog( 'executeTransaction:start ' + name );
  }

  async endReport( nargs ) {
    const {
      is_successful,
      name,
      log,
      suppressSuccessfulReport,
    } = nargs;

    const result = { name, log };

    await writeLog( 'executeTransaction:end' );
    await writeLog( '='.repeat(80) );
    await writeLog( );

    if ( is_successful ) {
      await writeLog( TERM_BG_BLUE + '#'.repeat(38) + 'OKAY' + '#'.repeat(39) + TERM_RESET  );

      if ( suppressSuccessfulReport ) {
        //
      } else {
        await writeDir( result  );
      }
      await writeLog();
      await writeLog();
    } else {
      await writeLog( TERM_BG_RED + '#'.repeat(80) + TERM_RESET );
      await writeLog( TERM_BG_RED + '#'.repeat(37) + 'ERROR' + '#'.repeat(38) + TERM_RESET );
      await writeLog( TERM_BG_RED + '#'.repeat(80) + TERM_RESET );
      await writeDir( result );
      await writeLog( );
      await writeLog( );
    }
  }
}
const CONSOLE_LOGGER = new ConsoleLogger();

class DummyLogger {
  async beginReport(nargs) {
  }
  async endReport(nargs) {
  }
}
const DUMMY_LOGGER = new DummyLogger();


const pad = (l,v)=>String(v).padStart(2,'0');
const to_yyyymmdd_hhmmss = (d)=>(
  ''
  + pad( 4, d.getFullYear()     )
  + pad( 2, d.getMonth()    + 1 )
  + pad( 2, d.getDate()         )
  + '-'
  + pad( 2, d.getHours()        )
  + pad( 2, d.getMinutes()      )
  + pad( 2, d.getSeconds()      )
);

const to_dirname = (d)=>(
  ''
  + pad( 4, d.getFullYear()     )
  + '/'
  + pad( 2, d.getMonth()    + 1 )
  + '/'
  + pad( 2, d.getDate()         )
  + '/'
  + pad( 2, d.getHours()        )
  + '/'
  + pad( 2, d.getMinutes()      )
);

const to_filename = (d)=>(
  ''
  + to_yyyymmdd_hhmmss( d )
);


const d = new Date();
console.log( to_filename( d ) );
console.log( to_filename( d ) );


class FileLogger {
  constructor(options){
    this.options = options;
    this.output_dir = options?.logger_output_dir ?? "./";
    this.modules =null;
  }

  async init_modules_lazily() {
    const result = await Promise.all([
      import( "node:path" ),
      import( "node:fs" ),
      import( "node:fs/promises" ),
    ]);

    // console.log( '2ObonT+kh51genRM606Azg==', 'Promise.all', result );

    this.modules = {
      path : result[0],
      fs   : result[1],
      fsp  : result[2],
    };
  }

  async beginReport(nargs) {
    if ( ! this.modules ) {
      await this.init_modules_lazily();
    }
  }

  async endReport(nargs) {
    const {
      is_successful,
      name,
      log,
      suppressSuccessfulReport,
    } = nargs;

    // console.log( '2ObonT+kh51genRM606Azg==', 'this.modules', this.modules );

    const now = new Date();
    const logger_filename = to_filename( now ) + '.json';
    const logger_dirname =  to_dirname( now );
    const logger_full_filename = this.modules.path.join( this.output_dir, logger_dirname, logger_filename );
    const logger_full_dirname = this.modules.path.join( this.output_dir, logger_dirname );

    // console.log( logger_full_dirname, logger_full_filename );

    await this.modules.fsp.mkdir( logger_full_dirname, { recursive : true, mode:0o777 } );

    const a_write_stream = this.modules.fs.createWriteStream( logger_full_filename, {flags:'w' } );
    try {
      const c = create_logger_console( a_write_stream, a_write_stream );
      c.dir( log, {
        colors         : false,
        depth          : null,
        maxArrayLength : null,
      });
    } finally {
      a_write_stream.end();
    }
  }
}

const select_logger_handler = (options)=>{
  if ( options?.showReport ) {
    switch ( options?.logger_report_method ) {
      case 'console' : {
        return CONSOLE_LOGGER;
      };
      case 'ignore' : {
        return DUMMY_LOGGER;
      };
      case 'file' : {
        return new FileLogger(options);
      };
      default : {
        return CONSOLE_LOGGER;
      };
    }
  } else {
    return DUMMY_LOGGER;
  }
};



export const MSG_LOG                  = 'log';
export const MSG_SUCCEEDED            = 'succeeded';
export const MSG_WARNING              = 'warning';
export const MSG_ERROR                = 'error';

const MSG_TRACE_BEGIN          = 'enter';
const MSG_TRACE_TRACE          = 'trace';
const MSG_TRACE_END            = 'leave';
const MSG_TRACE_END_WITH_ERROR = 'trace-end-with-error';

function formatArgs1( ...args ) {
  return args.length == 1 ? args.pop() : args.map( e=>e!=null ? unprevent(e).toString():'(null)').join(' ');
}
function formatArgs2( ...args ) {
  return [...args];
}
const formatArgs = formatArgs2;
const now = ()=>new Date();

export class AsyncContextLogger {
  name   = 'AsyncContextLogger';
  option = [];
  logger_handler = null;
  // logger_handler = DUMMY_LOGGER;
  constructor( name, options ) {
    this.reset( name, options );
  }

  reset( name, options ) {
    this.name         = name    ?? this.name;
    this.options      = options ?? this.options;
    this.logger_handler = select_logger_handler( options );
    this.logList      = [];
    this.logListStack = [];
    this.reportCount  = 0;
  }

  output( nargs) {
    this.logList.push({...nargs});
  }

  error(...args) {
    this.logList.push({
      type   : MSG_ERROR,
      time   : now(),
      value  : formatArgs(...args),
    });
  }

  warn(...args) {
    this.logList.push({
      type   : MSG_WARNING,
      time   : now(),
      value  : formatArgs(...args),
    });
  }

  log(...args) {
    this.logList.push({
      type   : MSG_LOG,
      time   : now(),
      value  : formatArgs(...args),
    });
  }

  trace(...args) {
    this.logList.push({
      type   : MSG_TRACE_TRACE,
      time   : now(),
      value  : formatArgs(...args),
    });
  }

  __descendLog() {
    const newLogList = [];
    const currLogList = this.logList;
    currLogList.push( newLogList );
    this.logListStack.push( currLogList );
    this.logList = newLogList;
  }

  __ascendLog() {
    const oldLogList = this.logListStack.pop();
    this.logList = oldLogList;
  }

  enter(name,args) {
    this.output({
      type   : MSG_TRACE_BEGIN,
      time   : now(),
      name   : name,
      args   : ( unprevent(args) ),
    });

    this.__descendLog();
  }

  leave(name,result) {
    this.__ascendLog();
    this.output({
      type   : MSG_TRACE_END,
      time   : now(),
      name   : name,
      status : 'succeeded',
      result : ( unprevent( result )),
    });
  }

  leave_with_error(name,result) {
    this.__ascendLog();
    this.output({
      type   : MSG_TRACE_END,
      time   : now(),
      name   : name,
      status : 'error',
      result : ( unprevent( result )),
    });
  }

  async reportResult( is_successful ) {
    await this.beginReport({ is_successful });
    await this.endReport(  { is_successful });
  }

  async beginReport(nargs) {
    await this?.logger_handler?.beginReport({
      name : this.name,
      log  : this.logList,
      ...this.options,
      ...nargs
    });
  }

  async endReport(nargs) {
    await this?.logger_handler?.endReport({
      name : this.name,
      log  : this.logList,
      ...this.options,
      ...nargs,
    });
  }
}

// module.exports.AsyncContextLogger = AsyncContextLogger;

