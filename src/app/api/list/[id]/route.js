"use server";
import List from "@/models/list";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { revalidateTag } from "next/cache";

export const GET = async (request) => {
  try {
    const {
      query: { id },
    } = request;
    connectToDb();
    const lists = await List.findOne({ id: id });
    return NextResponse.json(lists);
  } catch (err) {
    console.log(err);
    return NextResponse.json(
      { success: false },
      {
        status: 400,
      }
    );
  }
};
