import AWS from 'aws-sdk';
import createError from 'http-errors';
import commonMiddleware from '../lib/commonMiddleware';

const dynamodb = new AWS.DynamoDB.DocumentClient();

export async function getAuction(id) {
  let auction;

  try {
    const result = await dynamodb.get({ TableName: process.env.AUCTIONS_TABLE_NAME, Key: { id } }).promise();
    auction = result.Item;
  } catch (error) {
    console.error(error);
    throw new createError.InternalServerError(error);
  }

  if (!auction) throw new createError.NotFound(`Auction with ID ${id} not found!`);

    return auction;
}

async function getAuctionById(event, context) {
  const { id } = event.pathParameters;

  const auction = await getAuction(id);

    return {
      statusCode: 200,
      body: JSON.stringify(auction),
    };
}

export const handler = commonMiddleware(getAuctionById);


