/**
 * measuer the function call time cost
 * @param {any} _this the target function bind object
 * @param {Function} fn the callee function
 * @param {string} name function name (optional)
 * @returns {Function}
 */
//@es-ignore
function measureTimeFn(_this: any, fn: Function, name: string = 'unknown'): Function {
  let fname = fn.toString();
  fname = fname.substring('function '.length);
  fname = fname.substring(0, fname.indexOf('('));

  return function (...args: any[]): any {
    console.time(fname ?? name);
    const res = fn.bind(_this)(...args);
    console.timeEnd(fname ?? name);
    return res;
  };
}

/**
 * measue memory userage
 * @returns {Function} print the memeory useage step by step
 */
function measureMemFn(): Function {
  // closure variables
  const memoryStack: NodeJS.MemoryUsage[] = [];
  let step = -1;

  return function (name: string): void {
    const used = process.memoryUsage();
    const memDatas: {
      step: number;
      category: string;
      key: string;
      'used(MB)': number;
      'diff(MB)': number;
    }[] = [];
    step++;

    memoryStack.push(used);
    for (const key in used) {
      const key_used = Math.round((used[key as keyof NodeJS.MemoryUsage] / 1024 / 1024) * 100) / 100;
      let last_key_used = 0;
      if (step > 0) {
        last_key_used =
          Math.round((memoryStack[step - 1][key as keyof NodeJS.MemoryUsage] / 1024 / 1024) * 100) / 100;
      }
      memDatas.push({
        step: step,
        category: name,
        key: key,
        'used(MB)': key_used,
        'diff(MB)': Math.round((key_used - last_key_used) * 100) / 100,
      });
    }

    console.table(memDatas);
  };
}

export default {
  measureTimeFn,
  measureMemFn,
};
