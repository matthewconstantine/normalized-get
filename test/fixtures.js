export const articlesCommentsUsers = {
  articles: {
    123: {
      author: '8472',
      body: 'This article is great.',
      comments: [
          'comment-123-4738',
          'comment-123-9999',
        ],
      id: '123',
      title: 'A Great Article',
    },
  },
  comments: {
    'comment-123-4738': {
      comment: 'I like it!',
      id: 'comment-123-4738',
      user: '10293',
    },
    'comment-123-9999': {
      comment: 'I like too!',
      id: 'comment-123-9999',
      user: '8472',
    },
  },
  users: {
    10293: {
      id: '10293',
      name: 'Jane',
    },
    8472: {
      id: '8472',
      name: 'Paul',
    },
  },
};
