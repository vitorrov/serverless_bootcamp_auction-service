import AWS from 'aws-sdk';
import validator from '@middy/validator';
import createError from 'http-errors';
import commonMiddleware from '../lib/commonMiddleware';
import { getAuction } from './getAuctionById';
import placeBidSchema from '../lib/schemas/placeBidSchema';

const dynamodb = new AWS.DynamoDB.DocumentClient();

async function placeBid(event, context) {
  const { id } = event.pathParameters;
  const { amount } = event.body;
  const { email } = event.requestContext.authorizer;

  const auction = await getAuction(id);

  if (auction.status === 'CLOSED')
    throw new createError.Forbidden('You cannot bid on closed auctions!');

  if (amount <= auction.highestBid.amount)
    throw new createError.Forbidden(`Your bid must be higher than ${auction.highestBid.amount}!`);

  if (email === auction.highestBid.bidder)
    throw new createError.Conflict('Your bid is already the highest one!');

  if (email === auction.seller)
    throw new createError.Forbidden('You can not place a bid on your own auction!');

  const params = {
    TableName: process.env.AUCTIONS_TABLE_NAME,
    Key: { id },
    UpdateExpression: 'set highestBid.amount = :amount, highestBid.bidder = :bidder',
    ExpressionAttributeValues: {
      ':amount': amount,
      ':bidder': email,
    },
    ReturnValues: 'ALL_NEW',
  };

  let updatedAuction;

  try {
    const result = await dynamodb.update(params).promise();
    updatedAuction = result.Attributes;
  } catch (error) {
    console.error(error);
    createError.InternalServerError(error);
  }

    return {
      statusCode: 200,
      body: JSON.stringify(updatedAuction),
    };
}

export const handler = commonMiddleware(placeBid).use(
  validator({
    inputSchema: placeBidSchema,
    ajvOptions: {
      useDefaults: true,
      strict: false,
    },
  })
);
