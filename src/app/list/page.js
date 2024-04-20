import ListCard from '@/ui/ListCard/ListCard'
import Link from "next/link";
import { auth } from "@/lib/auth"

const getData = async () => {
  const session = await auth();
  const res = await fetch(process.env.NEXTAIU_URL+"/api/list", {headers:{userid:session?.user?.id},next:{revalidate:3600}});

  if (!res.ok) {

    throw new Error("Something went wrong");
  }

  return res.json();
};

const ListPage = async () => {

  // FETCH DATA WITH AN API
  const lists = await getData();

  // FETCH DATA WITHOUT AN API
  // const posts = await getPosts();

  return (
    <div className="md:container md:mx-auto" >
      <div className='flex justify-between shadow-xl bg-white rounded-md py-2 px-4 mx-auto max-w-md'>
        <div></div>
        <Link className='button button-primary'  href='list/new'>New show</Link>
      </div>
      {lists.map((list) => (
        <div className={styles.post} key={list.id}>
          <ListCard post={list} />
        </div>
      ))}
    </div>
  );
};

export default ListPage;