import { Component, OnInit } from '@angular/core';
import * as _ from 'lodash';
import { now } from 'moment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'ngx-excel-demo';

  ngOnInit() {
    const a = {'a': {'t':1}, 'c': { 'c1': 1, 'c2': 2 }};
    const b = {'b': {'t':1}, 'c': { 'c1': 2, 'c3': 3 }};
    const c = {'a': {'t':2}};
    _.forIn(a, (value, key) => _.set(value, 'name', key));
    // console.log(_.filter(a, (x) => x['t'] === 1), a);

    const a1 = [{'1': 1}, {'2': 2}, {'3': 3}];
    const b1 = _.cloneDeep(a1);
    b1[0]['1'] = 2;
    // console.log(a1, b1);

    const a2 = {'a': 1, 'b': 2, 'c': 3, 'd': 4, 'e': 5};
    const b2 = _.clone(a2);
    const excepts = ['b', 'e'];
    const keys = _.difference(_.keys(b2), _.concat(excepts, 'c'));
    const params = {'f': 6};
    console.log(_.pick(a2, keys));
    _.merge(params, _.pick(a2, keys));
    console.log(params);
    console.log(b2, excepts, keys);
    // console.log(a2, b2);

    const a3 = ['a', 'b', 'c'];
    const b3 = ['b', 'c', 'e'];
    console.log(_.xor(a3, b3));


    console.log(_.map(null, 'value'));
    // console.log(_.isSafeInteger(now()));


    const d = _.clone(a);
    console.log(a, d);
    // console.log(_.findKey(a, ['t', 2]));
    // console.log(_.mapValues(_.merge(a, null, c), (value) => _.assign(value, { name: value + '1' })));
    // console.log(_.merge(a, null, c), a);
    // console.log(_.merge(a, b, c));
    // console.log(_.filter(undefined, 'value'));
  }

}
