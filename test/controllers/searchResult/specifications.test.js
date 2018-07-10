const
  SpecificationsSearchResult = require('../../../src/controllers/searchResult/specifications'),
  sinon = require('sinon'),
  should = require('should');

describe('SpecificationsSearchResult', () => {
  const options = {opt: 'in'};

  let
    kuzzle,
    request,
    response,
    searchResult;

  beforeEach(() => {
    kuzzle = {
      query: sinon.stub().resolves()
    };

    request = {
      body: {foo: 'bar'},
      controller: 'collection',
      action: 'searchSpecifications',
    };
  });

  describe('constructor', () => {
    it('should create a SpecificationsSearchResult instance with good properties', () => {
      response = {
        hits: [
          {_id: 'index#collection1', _score: 0.9876, _source: {index: 'index', collection: 'collection1'}},
          {_id: 'index#collection2', _score: 0.6789, _source: {index: 'index', collection: 'collection2'}}
        ],
        total: 3
      };

      searchResult = new SpecificationsSearchResult(kuzzle, request, options, response);

      should(searchResult.kuzzle).be.equal(kuzzle);
      should(searchResult.request).be.equal(request);
      should(searchResult.options).be.equal(options);
      should(searchResult.response).be.equal(response);

      should(searchResult.hits).be.equal(response.hits);
      should(searchResult.fetched).be.equal(2);
      should(searchResult.total).be.equal(3);

      should(searchResult.controller).be.equal('collection');
      should(searchResult.searchAction).be.equal('searchSpecifications');
      should(searchResult.scrollAction).be.equal('scrollSpecifications');
    });
  });

  describe('next', () => {
    it('should resolve null without calling kuzzle query if all results are already fetched', () => {
      response = {
        scrollId: 'scroll-id',
        hits: [
          {_id: 'index#collection1', _score: 0.9876, _source: {index: 'index', collection: 'collection1'}},
          {_id: 'index#collection2', _score: 0.6789, _source: {index: 'index', collection: 'collection2'}}
        ],
        total: 2
      };

      searchResult = new SpecificationsSearchResult(kuzzle, request, options, response);

      return searchResult.next()
        .then(result => {
          should(kuzzle.query).not.be.called();
          should(result).be.Null();
        });

    });

    it('should throw an error if neither scroll, nor size/sort, nor size/from parameters are set', () => {
      response = {
        scrollId: 'scroll-id',
        hits: [
          {_id: 'index#collection1', _score: 0.9876, _source: {index: 'index', collection: 'collection1'}},
          {_id: 'index#collection2', _score: 0.6789, _source: {index: 'index', collection: 'collection2'}}
        ],
        total: 30
      };

      searchResult = new SpecificationsSearchResult(kuzzle, request, options, response);

      should(function () {
        searchResult.next();
      }).throw('Unable to retrieve next results from search: missing scrollId, from/sort, or from/size params');
    });

    describe('#with scroll option', () => {
      const nextResponse = {
        scrollId: 'scroll-id',
        hits: [
          {_id: 'index#collection3', _score: 0.6543, _source: {index: 'index', collection: 'collection3'}},
          {_id: 'index#collection4', _score: 0.6123, _source: {index: 'index', collection: 'collection4'}}
        ],
        total: 30
      };

      beforeEach(() => {
        request.scroll = '1m';

        response = {
          scrollId: 'scroll-id',
          hits: [
            {_id: 'index#collection1', _score: 0.9876, _source: {index: 'index', collection: 'collection1'}},
            {_id: 'index#collection2', _score: 0.6789, _source: {index: 'index', collection: 'collection2'}}
          ],
          total: 30
        };
        searchResult = new SpecificationsSearchResult(kuzzle, request, options, response);

        kuzzle.query.resolves(nextResponse);
      });

      it('should call collection/scrollSpecifications action with scrollId parameter and resolve the current object', () => {
        return searchResult.next()
          .then(res => {
            should(kuzzle.query)
              .be.calledOnce()
              .be.calledWith({
                body: {foo: 'bar'},
                controller: 'collection',
                action: 'scrollSpecifications',
                scroll: '1m',
                scrollId: 'scroll-id'
              }, options);
            should(res).be.equal(searchResult);
          });
      });

      it('should set the response and increment the "fetched" property', () => {
        should(searchResult.fetched).be.equal(2);
        should(searchResult.response).be.equal(response);
        return searchResult.next()
          .then(() => {
            should(searchResult.fetched).be.equal(4);
            should(searchResult.response).be.equal(nextResponse);
            should(searchResult.hits).be.equal(nextResponse.hits);
          });
      });
    });

    describe('#with size and sort option', () => {
      const nextResponse = {
        hits: [
          {_id: 'index#collection3', _score: 0.6543, _source: {index: 'index', collection: 'collection3'}},
          {_id: 'index#collection4', _score: 0.6123, _source: {index: 'index', collection: 'collection4'}}
        ],
        total: 30
      };

      beforeEach(() => {
        request.size = 2;
        request.sort = ['index', {collection: 'asc'}];

        response = {
          hits: [
            {_id: 'index#collection1', _score: 0.9876, _source: {index: 'index', collection: 'collection1'}},
            {_id: 'index#collection2', _score: 0.6789, _source: {index: 'index', collection: 'collection2'}}
          ],
          total: 30
        };
        searchResult = new SpecificationsSearchResult(kuzzle, request, options, response);

        kuzzle.query.resolves(nextResponse);
      });

      it('should call collection/searchSpecifications action with search_after parameter and resolve the current object', () => {
        return searchResult.next()
          .then(res => {
            should(kuzzle.query)
              .be.calledOnce()
              .be.calledWith({
                body: {foo: 'bar'},
                controller: 'collection',
                action: 'searchSpecifications',
                size: 2,
                sort: ['index', {collection: 'asc'}],
                search_after: ['index', 'collection2']
              }, options);
            should(res).be.equal(searchResult);
          });
      });

      it('should set the response and increment the "fetched" property', () => {
        should(searchResult.fetched).be.equal(2);
        should(searchResult.response).be.equal(response);
        return searchResult.next()
          .then(() => {
            should(searchResult.fetched).be.equal(4);
            should(searchResult.response).be.equal(nextResponse);
            should(searchResult.hits).be.equal(nextResponse.hits);
          });
      });
    });

    describe('#with from and size option', () => {
      const nextResponse = {
        hits: [
          {_id: 'index#collection3', _score: 0.6543, _source: {index: 'index', collection: 'collection3'}},
          {_id: 'index#collection4', _score: 0.6123, _source: {index: 'index', collection: 'collection4'}}
        ],
        total: 30
      };

      beforeEach(() => {
        request.size = 2;
        request.from = 2;

        response = {
          hits: [
            {_id: 'index#collection1', _score: 0.9876, _source: {index: 'index', collection: 'collection1'}},
            {_id: 'index#collection2', _score: 0.6789, _source: {index: 'index', collection: 'collection2'}}
          ],
          total: 30
        };
        searchResult = new SpecificationsSearchResult(kuzzle, request, options, response);

        kuzzle.query.resolves(nextResponse);
      });

      it('should resolve null without calling kuzzle query if from parameter is greater than the search count', () => {
        request.from = 30;

        return searchResult.next()
          .then(result => {
            should(kuzzle.query).not.be.called();
            should(result).be.Null();
          });

      });


      it('should call collection/searchSpecifications action with from/size parameters and resolve the current object', () => {
        return searchResult.next()
          .then(res => {
            should(kuzzle.query)
              .be.calledOnce()
              .be.calledWith({
                body: {foo: 'bar'},
                controller: 'collection',
                action: 'searchSpecifications',
                size: 2,
                from: 2
              }, options);
            should(res).be.equal(searchResult);
          });
      });

      it('should set the response and increment the "fetched" property', () => {
        should(searchResult.fetched).be.equal(2);
        should(searchResult.response).be.equal(response);
        return searchResult.next()
          .then(() => {
            should(searchResult.fetched).be.equal(4);
            should(searchResult.response).be.equal(nextResponse);
            should(searchResult.hits).be.equal(nextResponse.hits);
          });
      });
    });
  });
});