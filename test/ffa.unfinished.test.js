var tap = require('tap')
  , test = tap.test
  , $ = require('interlude')
  , FFA = require('../');

test("ffa 5 [5] [] limit 4", function (t) {
  var opts = { sizes: [5], limit: 4 };
  var ffa = new FFA(5, opts);
  var ms = ffa.matches;
  t.ok(!ffa.score(ms[0].id, [5,4,3,2,2]), "cannot score so we are tied at limit");
  t.ok(ffa.score(ms[0].id, [5,4,3,2,1]), "scoring works when untied");

  var res = ffa.results();
  res.forEach(function (r, i) {
    t.equal(r.pos, i+1, "positions should be linear from 1");
  });

  t.end();
});

test("ffa 10 [5] [] limit 4", function (t) {
  var opts = { sizes: [5] , limit: 4 };
  var ffa = new FFA(10, opts);
  var ms = ffa.matches;
  t.ok(!ffa.score(ms[0].id, [5,4,4,2,1]), "cannot score so we are tied at limit/NG");
  t.ok(ffa.score(ms[0].id, [5,4,3,2,1]), "scoring of M1 works when untied");
  t.ok(ffa.score(ms[1].id, [5,4,3,2,1]), "scoring of M2 works when untied");

  var res = ffa.results();
  res.forEach(function (r, i) {
    var nearestOdd = 2*Math.floor(i/2) + 1;
    t.equal(r.pos, nearestOdd, "positions should tie on odds");
  });

  t.end();
});

test("ffa 15 [5] [] limit 6", function (t) {
  var opts = { sizes: [5] , limit: 6 };
  var ffa = new FFA(15, opts); // limit must divide num groups
  var ms = ffa.matches;
  t.ok(!ffa.score(ms[0].id, [5,4,4,2,1]), "cannot score so we are tied at limit");
  t.ok(ffa.score(ms[0].id, [5,4,3,2,1]), "scoring of M1 works when untied");
  t.ok(ffa.score(ms[1].id, [5,4,3,2,1]), "scoring of M2 works when untied");
  t.ok(ffa.score(ms[2].id, [5,4,3,2,1]), "scoring of M3 works when untied");

  var res = ffa.results();
  res.forEach(function (r, i) {
    var nearestPlus3 = 3*Math.floor(i/3) + 1;
    t.equal(r.pos, nearestPlus3, "positions should tie on every 3rd (and =1 mod3)");
  });

  t.end();
});

test("ffa 16 4 2 unfinished no limits", function (t) {
  var opts = { sizes: [4, 4], advancers: [2] };
  var ffa = new FFA(16, opts);
  var fm = ffa.matches;
  t.equal(fm.length, 4+2, '2 rounds in unfinished ffa tournament');
  fm.forEach(function (m) {
    ffa.score(m.id, [4,3,2,1]);
  });
  var res = ffa.results();
  res.forEach(function (r) {
    if (r.seed <= 2) {
      t.equal(r.pos, 1, 'top 2 tied at 1');
    }
    else if (r.seed <= 4) {
      t.equal(r.pos, 3, '3-4 tied at 3');
    }
    else if (r.seed <= 6) {
      t.equal(r.pos, 5, '5-6 tied at 5');
    }
    else if (r.seed <= 8) {
      t.equal(r.pos, 7, '6-7 tied at 7');
    }
    else if (r.seed <= 12) {
      t.equal(r.pos, 9, '9-12 tied at 9');
    }
    else {
      t.equal(r.pos, 13, '13-16 tied at 13');
    }
  })

  t.end();
});

test("ffa 16 4 2 unfinished res limits", function (t) {
  var opts = { sizes: [4, 4], advancers: [2], limit: 4 };
  var ffaB = new FFA(16, opts);

  // quick serialization test as only case atm
  var ffa = FFA.parse(ffaB + '')
    , gs = ffa.matches;

  t.ok(gs.length > 0, "could create ffa with limits");

  // score first 4
  $.range(4).forEach(function (n) {
    ffa.score({s:1, r:1, m:n}, [4,3,2,1]);
  });

  var semis = gs.slice(-2);
  t.deepEqual(semis[0].p, [1,3,6,8], "fair inserts into semi1");
  t.deepEqual(semis[1].p, [2,4,5,7], "fair inserts into semi2");

  var res1 = ffa.results();
  res1.slice(0, 8).forEach(function (o) {
    t.ok(o.seed <= 8, "top 8 placer is one of top 8 seeds");
    t.equal(o.pos, 8, "top 8 placers ties at 8th before semis played");
  });
  var verifyLosers = function (res) {
    res.slice(8).forEach(function (o) {
      t.ok(o.seed > 8, "bottom 8 seeds are here");
      t.ok(o.pos > 8, "they have no chance of getting 8th anymore");
      // these tests are more specific than we position at the moment
      if ([9, 10, 11, 12].indexOf(o.seed) >= 0) {
        t.equal(o.pos, 9, "9-12 all got got equal score 3rds and thus tie at 9th");
      }
      if ([13, 14, 15, 16].indexOf(o.seed) >= 0) {
        t.equal(o.pos, 13, "13-16 all got equal score 4ths and thus tie at 13th");
      }
    });
  };
  verifyLosers(res1); // bottom 8 should be ready now

  // score semis (last round)
  ffa.score({s:1, r:2, m:2}, [4,3,2,1]); // score semi 2
  // if we just scored last then this next test would fail
  t.ok(!ffa.isDone(), "ffa should NOT be done yet");

  ffa.score({s:1, r:2, m:1}, [4,3,2,1]); // score semi 1
  t.ok(ffa.isDone(), "ffa should actually be done now");

  // check final results
  var res2 = ffa.results();
  t.ok(res2, "could get post-final semi results");

  verifyLosers(res2); // bottom 8 should at least remain the same

  res2.slice(0, 8).forEach(function (o) {
    t.ok(o.seed <= 8, "top 8 seeds is in the top 8");
    t.ok(o.pos <= 8, "and they are indeed in the top 8");
    if ([1, 2].indexOf(o.seed) >= 0) {
      t.equal(o.pos, 1, "1 and 2 both won their semi with 4");
      t.equal(o.wins, 2, "1 and 2 both proceeded to next tournament");
    }
    if ([3, 4].indexOf(o.seed) >= 0) {
      t.equal(o.pos, 3, "3 and 4 both 2nd'd their semi with 3");
      t.equal(o.wins, 2, "3 and 4 both proceeded to next tournament");
    }
    if ([5, 6].indexOf(o.seed) >= 0) {
      t.equal(o.pos, 5, "5 and 6 both 3rd'd their semi with 2");
      t.equal(o.wins, 1, "5 and 6 knocked out (not proceeding to next tournament)");
    }
    if ([7, 8].indexOf(o.seed) >= 0) {
      t.equal(o.pos, 7, "7 and 8 both 4th'd their semi with 1");
      t.equal(o.wins, 1, "7 and 8 knocked out (not proceeding to next tournament)");
    }
  });


  //if we scored semi 1 differently, it used to sort really badly between the groups
  ffa.score({s:1, r:2, m:1}, [8,7,6,5]); // score semi 1 weirdly
  // NB: that was the semi with 1, 3, 6, 8 in it
  // so score list is:
  //{
  //  1: 8, POS 1 (tight)
  //  2: 4, 1
  //  3: 7, POS 2 (tight)
  //  4: 3, 2
  //  5: 2, 3
  //  6: 6, POS 3 (tight)
  //  7: 1, 4
  //  8: 5  POS 4 (tight)
  //}
  // note it should tie Xth-placers at the moment between groups

  var res2b = ffa.results();
  t.ok(res2b, "could get post-final semi results");
  verifyLosers(res2b); // bottom 8 should at least remain the same

  res2b.slice(0, 8).forEach(function (o) {
    // winners should be sorted within groups only - tie X-placers
    t.ok(o.seed <= 8, "top 8 seeds is in the top 8");
    t.ok(o.pos <= 8, "and they are indeed in the top 8");
    if (o.seed === 1) {
      t.equal(o.pos, 1, "1 won the 'tighter' semi with 8");
    }
    if (o.seed === 2) {
      t.equal(o.pos, 1, "2 won the 'easier' semi with 4");
    }
    if (o.seed === 3) {
      t.equal(o.pos, 3, "3 2nd'd the 'tighter' semi with 7");
    }
    if (o.seed === 4) {
      t.equal(o.pos, 3, "4 2nd'd the 'easier' semi with 3");
    }

    // losers can be sorted between groups, but only up to placement!
    if (o.seed === 6) {
      t.equal(o.pos, 5, "6 3rd'd the 'tighter' semi with 6");
    }
    if (o.seed === 5) {
      t.equal(o.pos, 5, "5 3rd'd the 'easier' semi with 2");
    }
    if (o.seed === 8) {
      t.equal(o.pos, 7, "8 4th'd the 'tighter' semi with 5");
    }
    if (o.seed === 7) {
      t.equal(o.pos, 7, "8 4th'd the 'easier' semi with 1");
    }
  });

  t.end();
});
