function succeed(data, msg = '成功') {
  return { code: 0, msg, data };
}

function fail(msg = '失败', code = -2, data = null) {
  return { code, msg, data };
}

function tokenInvalid(msg = '认证失效') {
  return fail(msg, -1);
}

function loginElsewhere(msg = '您的账号已在其它地方登录，请重新登录') {
  return fail(msg, -3);
}

function forbidden(msg = '无权限访问') {
  return fail(msg, -4);
}

module.exports = {
  succeed,
  fail,
  tokenInvalid,
  loginElsewhere,
  forbidden
};
