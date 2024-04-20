import List from "@/models/list";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { headers } from 'next/headers'

export const GET = async (request) => {
  try {
    const userid = headers().get('userid');
    connectToDb();
    console.log("***********************************")
    const lists = await List.findAll({userid});
    return NextResponse.json(lists);
  } catch (err) {
    console.log(err);
    throw new Error("Failed to fetch lists!");
  }
};

// export const POST = async (request) => {
//   try {
//     connectToDb();
//     console.log("***********************************")
//     const lists = await List.find();
//     return NextResponse.json(lists);
//   } catch (err) {
//     console.log(err);
//     throw new Error("Failed to fetch lists!");
//   }
// };